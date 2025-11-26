import { IsEnum, IsOptional, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '../entities/expense.entity';

export class FilterExpensesDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: ExpenseCategory,
  })
  @IsEnum(ExpenseCategory)
  @IsOptional()
  category?: ExpenseCategory;

  @ApiPropertyOptional({
    description: 'Filter by month (1-12)',
    example: 11,
  })
  @IsNumberString()
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({
    description: 'Filter by year',
    example: 2025,
  })
  @IsNumberString()
  @IsOptional()
  year?: number;
}
