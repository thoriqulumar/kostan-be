import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  Post,
  Body,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { UserRole } from '../users/entities/user.entity';
import { CreateRoomDto, UpdateRoomDto } from './dto/rooms.dto';

@ApiTags('Rooms')
@ApiBearerAuth('JWT-auth')
@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new room (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Room created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Room A1',
        price: 12012,
        rentedUserId: null,
        rentStartDate: null,
        isActive: true,
        createdAt: '2025-11-17T10:00:00.000Z',
        updatedAt: '2025-11-17T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update room details (Admin only)' })
  @ApiParam({ name: 'id', description: 'Room ID (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Room updated successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Room A1 Updated',
        price: 15000,
        rentedUserId: null,
        rentStartDate: null,
        isActive: true,
        createdAt: '2025-11-17T10:00:00.000Z',
        updatedAt: '2025-11-17T11:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async update(@Param('id') id, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all rooms with rented user details (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of all rooms',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Room A1',
          price: 12012,
          rentedUserId: '987e6543-e21b-12d3-a456-426614174999',
          rentStartDate: '2025-11-17T10:00:00.000Z',
          isActive: true,
          createdAt: '2025-11-17T09:00:00.000Z',
          updatedAt: '2025-11-17T10:00:00.000Z',
          rentedUser: {
            id: '987e6543-e21b-12d3-a456-426614174999',
            email: 'user@example.com',
            fullName: 'John Doe',
            phone: '+1234567890',
            role: 'user',
            isActive: true,
            createdAt: '2025-11-17T08:00:00.000Z',
            updatedAt: '2025-11-17T08:00:00.000Z',
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getRooms() {
    return this.roomsService.findAll();
  }

  @Get('with-payment-status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Get all rooms with payment status for specified or current month (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns list of all rooms with their payment status for the specified month',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getRoomsWithPaymentStatus(
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.roomsService.findAllWithPaymentStatus(month, year);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a room (Admin only)' })
  @ApiParam({ name: 'id', description: 'Room ID (UUID)', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Room deleted successfully',
    schema: {
      example: {
        message: 'Room deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async delete(@Param('id') id: string) {
    await this.roomsService.delete(id);
    return { message: 'Room deleted successfully' };
  }
}
