import {
    Controller,
    Get,
    Patch,
    Delete,
    Param,
    UseGuards,
    Request,
    Post,
    Body,
    Put
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { UserRole } from '../users/entities/user.entity';
import { CreateRoomDto, UpdateRoomDto } from './dto/rooms.dto';

@ApiTags('Rooms')
@ApiBearerAuth('JWT-auth')
@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomsController {
    constructor(private readonly roomsService: RoomsService) { }

    @Post()
    @Roles(UserRole.ADMIN)
    async create(@Body() createRoomDto: CreateRoomDto) {
        console.log({ createRoomDto })
        return this.roomsService.create(createRoomDto);
    }

    @Put(':id')
    @Roles(UserRole.ADMIN)
    async(@Param('id') id, @Body() updateRoomDto: UpdateRoomDto) {
        return this.roomsService.update(id, updateRoomDto)
    }

    @Get()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get all rooms by admin' })
    async getRooms() {
        return this.roomsService.findAll();
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    async delete(@Param('id') id: string) {
        await this.roomsService.delete(id);
        return { message: 'Room deleted successfully' };
    }


}