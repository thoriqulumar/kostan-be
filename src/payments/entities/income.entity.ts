import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Room } from '../../rooms/entities/rooms.entity';
import { PaymentReceipt } from './payment-receipt.entity';

@Entity('incomes')
export class Income {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  paymentReceiptId: string;

  @Column()
  roomId: string;

  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  paymentMonth: number; // 1-12

  @Column()
  paymentYear: number; // e.g., 2025

  @Column()
  description: string; // e.g., "Payment October 2025 - Room A1"

  @Column()
  confirmedByAdminId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => PaymentReceipt, { eager: true })
  @JoinColumn({ name: 'paymentReceiptId' })
  paymentReceipt: PaymentReceipt;

  @ManyToOne(() => Room, { eager: true })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @ManyToOne(() => User, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'confirmedByAdminId' })
  confirmedByAdmin: User;
}
