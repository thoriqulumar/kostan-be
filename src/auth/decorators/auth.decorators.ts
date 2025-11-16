import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

// Decorator to mark routes as public (no auth required)
export const Public = () => SetMetadata('isPublic', true);

// Decorator to specify required roles
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);