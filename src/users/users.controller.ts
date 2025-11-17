import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { UserRole } from './entities/user.entity';
import { FilterUsersDto } from './dto/filter-users.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get current user profile
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current user profile',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        fullName: 'John Doe',
        phone: '+1234567890',
        role: 'USER',
        isActive: true,
        createdAt: '2025-11-17T10:30:00.000Z',
        updatedAt: '2025-11-17T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    return this.usersService.findOne(req.user.userId);
  }

  // Admin only: Get all users
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users with optional filters (Admin only)' })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'roomStatus',
    required: false,
    enum: ['assigned', 'unassigned'],
    description: 'Filter by room assignment status',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of all users',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          fullName: 'John Doe',
          phone: '+1234567890',
          role: 'USER',
          isActive: true,
          createdAt: '2025-11-17T10:30:00.000Z',
          updatedAt: '2025-11-17T10:30:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async findAll(@Query() filters: FilterUsersDto) {
    return this.usersService.findAll(filters);
  }

  // Admin only: Get specific user
  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        fullName: 'John Doe',
        phone: '+1234567890',
        role: 'USER',
        isActive: true,
        createdAt: '2025-11-17T10:30:00.000Z',
        updatedAt: '2025-11-17T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // Admin only: Toggle user active status
  @Patch(':id/toggle-active')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Toggle user active status (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User active status toggled successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        fullName: 'John Doe',
        phone: '+1234567890',
        role: 'USER',
        isActive: false,
        createdAt: '2025-11-17T10:30:00.000Z',
        updatedAt: '2025-11-17T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }

  // Admin only: Delete user
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    schema: {
      example: {
        message: 'User deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}