import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../rooms/entities/rooms.entity';

@Injectable()
export class RentalsService {
  constructor(
    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
  ) {}

  async assignUserToRoom(roomId: string, userId: string): Promise<Room> {
    // Find the room
    const room = await this.roomsRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    // Check if room is already rented
    if (room.rentedUserId && room.rentedUserId !== userId) {
      throw new BadRequestException('Room is already rented by another user');
    }

    // Assign user to room and set rent start date
    room.rentedUserId = userId;
    room.rentStartDate = new Date();

    return await this.roomsRepository.save(room);
  }

  async rentedRoom(userId: string): Promise<Room | null> {
    // Find room rented by the user
    const room = await this.roomsRepository.findOne({
      where: { rentedUserId: userId },
      relations: ['rentedUser'],
      select: {
        rentedUser: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    });

    return room;
  }

  async unassignUserFromRoom(userId: string): Promise<Room> {
    // Find the room rented by user
    const room = await this.roomsRepository.findOne({
      where: { rentedUserId: userId },
    });

    if (!room) {
      throw new NotFoundException('You are not renting any room');
    }

    // Remove user from room
    room.rentedUserId = null as any;
    room.rentStartDate = null as any;

    return await this.roomsRepository.save(room);
   }
}