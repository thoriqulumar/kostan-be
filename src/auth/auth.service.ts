import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto, ResetPasswordDto } from './dto/auth.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Generate token
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      token,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate token
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      token,
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'If the email exists, a reset link will be sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Set expiration (1 hour)
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await this.usersService.updateResetToken(user.id, hashedToken, expires);

    // Email notifications disabled
    // TODO: Send email with reset token
    // For now, return token in response (remove in production!)
    this.logger.log(`Password reset requested for user: ${email} (email disabled)`);

    return {
      message: 'Password reset feature is currently disabled (email not configured)',
      // Email notifications disabled - token should be sent via email in production
      resetToken, // This should be sent via email when email is enabled
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    // Find user with valid reset token
    const user = await this.usersService.findByResetToken();
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Verify token
    const isTokenValid = await bcrypt.compare(
      resetPasswordDto.token,
      user.resetPasswordToken,
    );
    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid reset token');
    }

    // Check if token expired
    if (new Date() > user.resetPasswordExpires) {
      throw new UnauthorizedException('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    // Update password and clear reset token
    await this.usersService.updatePassword(user.id, hashedPassword);

    return { message: 'Password reset successful' };
  }

  private generateToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: string) {
    return await this.usersService.findOne(userId);
  }

  async logout(userId: string) {
    // In a stateless JWT system, logout is primarily handled client-side
    // by discarding the token. This endpoint can be used for:
    // 1. Logging the logout event for audit purposes
    // 2. Future token blacklisting implementation if needed

    // Optional: Log logout event
    this.logger.log(`User ${userId} logged out at ${new Date().toISOString()}`);

    return {
      message: 'Logout successful',
    };
  }
}