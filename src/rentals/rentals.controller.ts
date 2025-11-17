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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { UserRole } from '../users/entities/user.entity';
import { RentalsService } from './rentals.service';
import { AssignRoomDto, UnassignRoomDto } from './dto/rental.dto';


@ApiTags('Rentals')
@ApiBearerAuth('JWT-auth')
@Controller('rentals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RentalsController {
    constructor(private readonly rentalService: RentalsService) { }

    @Post()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Assign a user to a room (Admin only)' })
    @ApiResponse({ status: 201, description: 'Room rented successfully' })
    @ApiResponse({ status: 404, description: 'Room not found' })
    @ApiResponse({ status: 400, description: 'Room already rented' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async rentRoom(@Body() assignRoomDto: AssignRoomDto) {
        return this.rentalService.assignUserToRoom(assignRoomDto.roomId, assignRoomDto.userId);
    }

    @Post('unassign')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Remove a user from their rented room (Admin only)' })
    @ApiResponse({ status: 200, description: 'User removed from room successfully' })
    @ApiResponse({ status: 404, description: 'User is not renting any room' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async unassignUserFromRoom(@Body() unassignRoomDto: UnassignRoomDto) {
        return this.rentalService.unassignUserFromRoom(unassignRoomDto.userId);
    }

    @Get('my-room')
    @ApiOperation({ summary: 'Get my rented room' })
    @ApiResponse({ status: 200, description: 'Return user rented room' })
    async getMyRentedRoom(@Request() req) {
        const userId = req.user.userId;
        return this.rentalService.rentedRoom(userId);
    }
}