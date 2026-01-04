import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { Room } from './entities/rooms.entity';
import { PaymentReceipt } from '../payments/entities/payment-receipt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Room, PaymentReceipt])],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService], // Export so AuthModule can use it
})
export class RoomsModule {}
