import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/rooms.entity';
import {
  PaymentReceipt,
  PaymentStatus,
} from '../payments/entities/payment-receipt.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
    @InjectRepository(PaymentReceipt)
    private paymentReceiptRepository: Repository<PaymentReceipt>,
  ) {}

  async create(roomData: Partial<Room>): Promise<Room> {
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
      select: [
        'id',
        'name',
        'rentedUserId',
        'rentStartDate',
        'price',
        'isActive',
        'createdAt',
      ],
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
        createdAt: 'DESC',
      },
      relations: ['rentedUser'],
    });
  }

  async delete(id: string): Promise<void> {
    const room = await this.findOne(id);
    await this.roomsRepository.remove(room);
  }

  async findAllWithPaymentStatus(
    month?: number,
    year?: number,
  ): Promise<any[]> {
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const targetYear = year || currentDate.getFullYear();

    const rooms = await this.roomsRepository.find({
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
        createdAt: 'DESC',
      },
      relations: ['rentedUser'],
    });

    // For each room, check if there's an approved payment for the current month
    const roomsWithPaymentStatus = await Promise.all(
      rooms.map(async (room) => {
        let isPaidThisMonth = false;
        let paymentDetails: null | {
          id: string;
          amount: number;
          paymentMonth: number;
          paymentYear: number;
          confirmedAt: Date;
        } = null;

        if (room.rentedUserId) {
          const payment = await this.paymentReceiptRepository.findOne({
            where: {
              roomId: room.id,
              paymentMonth: targetMonth,
              paymentYear: targetYear,
              status: PaymentStatus.APPROVED,
            },
            order: {
              confirmedAt: 'DESC',
            },
          });

          if (payment) {
            isPaidThisMonth = true;
            paymentDetails = {
              id: payment.id,
              amount: payment.amount,
              paymentMonth: payment.paymentMonth,
              paymentYear: payment.paymentYear,
              confirmedAt: payment.confirmedAt,
            };
          }
        }

        return {
          ...room,
          isPaidThisMonth,
          paymentDetails,
          currentMonth: targetMonth,
          currentYear: targetYear,
        };
      }),
    );

    return roomsWithPaymentStatus;
  }
}
