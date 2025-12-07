import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  UseGuards,
  Request,
  Res,
  Query,
  UnauthorizedException,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { NotificationsService } from './notifications.service';
import { NotificationsSseService } from './notifications.sse';
import { NotificationType } from './entities/notification.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly sseService: NotificationsSseService,
  ) {}

  @Get('stream')
  @ApiOperation({ summary: 'SSE endpoint for real-time notifications' })
  async streamNotifications(
    @Query('token') token: string,
    @Res() response: Response,
  ) {
    try {
      // Verify JWT token
      const payload = this.sseService.verifyToken(token);
      const userId = payload.sub;

      // Set SSE headers
      response.setHeader('Content-Type', 'text/event-stream');
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('Connection', 'keep-alive');
      response.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Add client to SSE service
      this.sseService.addClient(userId, response);

      // Send initial unread count
      const unreadNotifications =
        await this.notificationsService.getUnreadNotifications(userId);
      response.write(`event: unread_count\n`);
      response.write(`data: ${JSON.stringify({ count: unreadNotifications.length })}\n\n`);

      // Send initial connection success
      response.write(`event: connected\n`);
      response.write(`data: ${JSON.stringify({ message: 'Connected to notifications stream' })}\n\n`);
    } catch (error) {
      response.status(401).json({ message: 'Unauthorized' });
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get all notifications for current user' })
  async getNotifications(@Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.getUserNotifications(userId);
  }

  @Get('unread')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get unread notifications for current user' })
  async getUnreadNotifications(@Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.getUnreadNotifications(userId);
  }

  @Get('unread/count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get unread notifications count' })
  async getUnreadCount(@Request() req) {
    const userId = req.user.userId;
    const unreadNotifications =
      await this.notificationsService.getUnreadNotifications(userId);
    return { count: unreadNotifications.length };
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    await this.notificationsService.markAsRead(id, userId);

    // Send updated unread count via SSE
    const unreadNotifications =
      await this.notificationsService.getUnreadNotifications(userId);
    this.sseService.sendUnreadCountToUser(userId, unreadNotifications.length);

    return { message: 'Notification marked as read' };
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req) {
    const userId = req.user.userId;
    await this.notificationsService.markAllAsRead(userId);

    // Send updated unread count via SSE
    this.sseService.sendUnreadCountToUser(userId, 0);

    return { message: 'All notifications marked as read' };
  }

  @Post('trigger-payment-reminders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger payment reminder notifications (Admin only)' })
  async triggerPaymentReminders() {
    await this.notificationsService.sendPaymentReminders();
    return {
      message: 'Payment reminders triggered successfully',
      timestamp: new Date().toISOString()
    };
  }

  @Post('test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Send a test notification to current user (for testing SSE)' })
  async sendTestNotification(@Request() req) {
    const userId = req.user.userId;

    await this.notificationsService.createNotification(
      userId,
      NotificationType.PAYMENT_REMINDER,
      'Test Notification',
      `This is a test notification sent at ${new Date().toLocaleTimeString('id-ID')}`,
    );

    return {
      message: 'Test notification sent!',
      userId,
      timestamp: new Date().toISOString()
    };
  }
}
