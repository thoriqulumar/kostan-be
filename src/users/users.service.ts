import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { FilterUsersDto } from './dto/filter-users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return await this.usersRepository.save(user);
  }

  async findAll(filters?: FilterUsersDto): Promise<User[]> {
    const where: any = {};

    // Filter by role if provided
    if (filters?.role) {
      where.role = filters.role;
    }

    // Filter by room assignment status
    if (filters?.roomStatus === 'assigned') {
      // Users who have a room assigned (have rentedRoom relation)
      return await this.usersRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.rentedRoom', 'room')
        .where('room.id IS NOT NULL')
        .andWhere(filters?.role ? 'user.role = :role' : '1=1', { role: filters?.role })
        .select([
          'user.id',
          'user.email',
          'user.fullName',
          'user.phone',
          'user.role',
          'user.isActive',
          'user.createdAt',
          'room.id',
          'room.name',
          'room.price',
        ])
        .getMany();
    } else if (filters?.roomStatus === 'unassigned') {
      // Users who don't have a room assigned
      return await this.usersRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.rentedRoom', 'room')
        .where('room.id IS NULL')
        .andWhere(filters?.role ? 'user.role = :role' : '1=1', { role: filters?.role })
        .select([
          'user.id',
          'user.email',
          'user.fullName',
          'user.phone',
          'user.role',
          'user.isActive',
          'user.createdAt',
        ])
        .getMany();
    }

    // No room status filter - return all users matching role filter
    return await this.usersRepository.find({
      where,
      select: ['id', 'email', 'fullName', 'phone', 'role', 'isActive', 'createdAt'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'fullName', 'phone', 'role', 'isActive', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { email },
    });
  }

  async findByResetToken(): Promise<User | null> {
    return await this.usersRepository
      .createQueryBuilder('user')
      .where('user.resetPasswordToken IS NOT NULL')
      .andWhere('user.resetPasswordExpires > :now', { now: new Date() })
      .getOne();
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, updateData);
    return this.findOne(id);
  }

  async updateResetToken(
    id: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.usersRepository.update(id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(id, {
      password: hashedPassword,
      resetPasswordToken: () => 'NULL',
      resetPasswordExpires: () => 'NULL',
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async toggleActive(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = !user.isActive;
    return await this.usersRepository.save(user);
  }
}