import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class FilterUsersDto {
  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Filter by user role',
    example: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    enum: ['assigned', 'unassigned'],
    description: 'Filter by room assignment status',
    example: 'unassigned',
  })
  @IsOptional()
  @IsString()
  roomStatus?: 'assigned' | 'unassigned';
}
