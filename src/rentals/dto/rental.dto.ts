import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoomDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Room ID to rent' })
  @IsUUID()
  roomId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'User ID to assign to the room' })
  @IsUUID()
  userId: string;
}

export class UnassignRoomDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'User ID to remove from their room' })
  @IsUUID()
  userId: string;
}
