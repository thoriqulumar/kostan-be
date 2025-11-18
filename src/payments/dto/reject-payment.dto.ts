import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectPaymentDto {
  @ApiProperty({
    description: 'Reason for rejecting the payment',
    example: 'Amount does not match the room rent price',
  })
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}
