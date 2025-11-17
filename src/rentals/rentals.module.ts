import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalsService } from './rentals.service';
import { RentalsController } from './rentals.controller';
import { Room } from '../rooms/entities/rooms.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Room])],
  controllers: [RentalsController],
  providers: [RentalsService],
  exports: [RentalsService], // Export so AuthModule can use it
})
export class RentalsModule {}