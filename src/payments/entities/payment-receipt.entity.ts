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

export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('payment_receipts')
export class PaymentReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  roomId: string;

  @Column()
  paymentMonth: number; // 1-12

  @Column()
  paymentYear: number; // e.g., 2025

  @Column()
  receiptFilePath: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ nullable: true })
  confirmedByAdminId: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Room, { eager: true })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'confirmedByAdminId' })
  confirmedByAdmin: User;
}
