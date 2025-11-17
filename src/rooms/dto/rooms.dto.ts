import { IsEmail, IsString, MinLength, IsOptional, isString, IsNumber, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty()
  @IsString()  
  name: string;

  @ApiProperty()
  @IsNumber()
  price: number;
}

export class UpdateRoomDto {
  @ApiProperty()
  @IsString()  
  name: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsOptional()
  @IsUUID()
  rentedUserId?: string;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  rentStartDate?: Date;
}