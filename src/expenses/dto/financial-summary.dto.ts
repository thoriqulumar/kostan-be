import { ApiProperty } from '@nestjs/swagger';

export class FinancialSummaryDto {
  @ApiProperty({
    description: 'Total income for the period',
    example: 5000000,
  })
  totalIncome: number;

  @ApiProperty({
    description: 'Total expenses for the period',
    example: 1500000,
  })
  totalExpenses: number;

  @ApiProperty({
    description: 'Net profit (income - expenses)',
    example: 3500000,
  })
  netProfit: number;

  @ApiProperty({
    description: 'Month (1-12) if filtering by month',
    example: 11,
    required: false,
  })
  month?: number;

  @ApiProperty({
    description: 'Year',
    example: 2025,
  })
  year: number;

  @ApiProperty({
    description: 'Period description',
    example: 'November 2025',
  })
  period: string;
}
