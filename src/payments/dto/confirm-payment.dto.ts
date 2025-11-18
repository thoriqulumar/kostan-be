import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPaymentDto {
  @ApiProperty({
    description: 'Approve or reject the payment',
    example: true,
  })
  @IsBoolean()
  approved: boolean;
}
