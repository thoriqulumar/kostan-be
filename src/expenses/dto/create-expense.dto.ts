import { IsEnum, IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExpenseCategory } from '../entities/expense.entity';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Expense amount',
    example: 500000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Expense category',
    enum: ExpenseCategory,
    example: ExpenseCategory.UTILITIES,
  })
  @IsEnum(ExpenseCategory)
  @IsNotEmpty()
  category: ExpenseCategory;

  @ApiProperty({
    description: 'Expense description',
    example: 'Monthly electricity bill for November 2025',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Expense date (YYYY-MM-DD)',
    example: '2025-11-20',
  })
  @IsDateString()
  @IsNotEmpty()
  expenseDate: string;

  @ApiProperty({
    description: 'Receipt/invoice image URL',
    example: 'https://example.com/receipt.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  receiptUrl?: string;
}
