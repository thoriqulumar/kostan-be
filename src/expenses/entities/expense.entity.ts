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
import { ApiProperty } from '@nestjs/swagger';

export enum ExpenseCategory {
  UTILITIES = 'utilities', // Electricity, Water, Gas
  MAINTENANCE = 'maintenance', // Repairs, Cleaning
  SUPPLIES = 'supplies', // Cleaning supplies, toiletries
  INTERNET = 'internet',
  SALARY = 'salary', // Staff salary
  TAX = 'tax',
  OTHER = 'other',
}

@Entity('expenses')
export class Expense {
  @ApiProperty({
    description: 'Expense unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Expense amount',
    example: 500000,
  })
  @Column({ type: 'integer' })
  amount: number;

  @ApiProperty({
    description: 'Expense category',
    enum: ExpenseCategory,
    example: ExpenseCategory.UTILITIES,
  })
  @Column({
    type: 'enum',
    enum: ExpenseCategory,
  })
  category: ExpenseCategory;

  @ApiProperty({
    description: 'Expense description',
    example: 'Monthly electricity bill',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    description: 'Expense date',
    example: '2025-11-20',
  })
  @Column({ type: 'date' })
  expenseDate: Date;

  @ApiProperty({
    description: 'Expense month (1-12)',
    example: 11,
  })
  @Column()
  expenseMonth: number;

  @ApiProperty({
    description: 'Expense year',
    example: 2025,
  })
  @Column()
  expenseYear: number;

  @ApiProperty({
    description: 'Admin who recorded this expense',
  })
  @Column()
  recordedByAdminId: string;

  @ApiProperty({
    description: 'Receipt/invoice image URL',
    required: false,
  })
  @Column({ nullable: true })
  receiptUrl: string;

  @ApiProperty({
    description: 'Expense creation timestamp',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Expense last update timestamp',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recordedByAdminId' })
  recordedByAdmin: User;
}
