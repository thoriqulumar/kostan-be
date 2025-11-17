import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/rooms.entity';

@Injectable()
export class RoomsService {
    constructor(
        @InjectRepository(Room)
        private roomsRepository: Repository<Room>,
    ) { }

    async create(roomData: Partial<Room>): Promise<Room> {
        console.log({ roomData })
        const room = this.roomsRepository.create(roomData);
        return await this.roomsRepository.save(room);
    }

    async update(id, updateRoom: Partial<Room>): Promise<Room> {
        await this.roomsRepository.update(id, updateRoom);
        return this.findOne(id);
    }

    async findOne(id: string): Promise<Room> {
        const user = await this.roomsRepository.findOne({
            where: { id },
            select: ['id', 'name', 'rentedUserId', 'rentStartDate', 'price', 'isActive', 'createdAt'],
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async findAll(): Promise<Room[]> {
        return await this.roomsRepository.find({
            select: {
                id: true,
                name: true,
                rentedUserId: true,
                rentStartDate: true,
                price: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
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
            order: {
                createdAt: 'DESC'
            },
            relations: ['rentedUser'],
        });
    }

    async delete(id: string): Promise<void> {
        const room = await this.findOne(id);
        await this.roomsRepository.remove(room);
    }

}