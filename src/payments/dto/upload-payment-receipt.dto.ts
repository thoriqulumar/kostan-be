import { IsInt, IsNumber, IsPositive, Min, Max, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadPaymentReceiptDto {
  @ApiProperty({
    description: 'Payment month (1-12)',
    example: 10,
    minimum: 1,
    maximum: 12,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  paymentMonth: number;

  @ApiProperty({
    description: 'Payment year',
    example: 2025,
    minimum: 2020,
  })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  paymentYear: number;

  @ApiProperty({
    description: 'Amount paid',
    example: 1500000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({
    description: 'Optional description or note for this payment',
    example: 'Pembayaran sewa bulan Oktober 2025',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
