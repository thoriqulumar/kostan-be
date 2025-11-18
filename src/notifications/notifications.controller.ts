import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  async getNotifications(@Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.getUserNotifications(userId);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications for current user' })
  async getUnreadNotifications(@Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.getUnreadNotifications(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    await this.notificationsService.markAsRead(id, userId);
    return { message: 'Notification marked as read' };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req) {
    const userId = req.user.userId;
    await this.notificationsService.markAllAsRead(userId);
    return { message: 'All notifications marked as read' };
  }

  @Post('trigger-payment-reminders')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger payment reminder notifications (Admin only)' })
  async triggerPaymentReminders() {
    await this.notificationsService.sendPaymentReminders();
    return {
      message: 'Payment reminders triggered successfully',
      timestamp: new Date().toISOString()
    };
  }
}
