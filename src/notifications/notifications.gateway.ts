import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:5173'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    // Set this gateway in the notifications service
    this.notificationsService.setGateway(this);
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from query or handshake
      const token =
        client.handshake.query.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token as string);
      const userId = payload.sub;

      // Store user's socket connection
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Store userId in socket data for later use
      client.data.userId = userId;

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

      // Send unread notifications count on connection
      const unreadNotifications =
        await this.notificationsService.getUnreadNotifications(userId);
      client.emit('unread_count', unreadNotifications.length);
    } catch (error) {
      this.logger.error(`Authentication failed for ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('get_notifications')
  async handleGetNotifications(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const notifications =
      await this.notificationsService.getUserNotifications(userId);
    client.emit('notifications', notifications);
  }

  @SubscribeMessage('get_unread_count')
  async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const unreadNotifications =
      await this.notificationsService.getUnreadNotifications(userId);
    client.emit('unread_count', unreadNotifications.length);
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    payload: { notificationId: string },
  ) {
    const userId = client.data.userId;
    await this.notificationsService.markAsRead(payload.notificationId, userId);

    // Send updated unread count
    const unreadNotifications =
      await this.notificationsService.getUnreadNotifications(userId);
    client.emit('unread_count', unreadNotifications.length);
  }

  @SubscribeMessage('mark_all_as_read')
  async handleMarkAllAsRead(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    await this.notificationsService.markAllAsRead(userId);
    client.emit('unread_count', 0);
  }

  // Method to send notification to specific user
  sendNotificationToUser(userId: string, notification: any) {
    const userSocketIds = this.userSockets.get(userId);
    if (userSocketIds) {
      userSocketIds.forEach((socketId) => {
        this.server.to(socketId).emit('new_notification', notification);
      });
      this.logger.log(`Notification sent to user ${userId}`);
    }
  }

  // Method to send unread count update
  sendUnreadCountToUser(userId: string, count: number) {
    const userSocketIds = this.userSockets.get(userId);
    if (userSocketIds) {
      userSocketIds.forEach((socketId) => {
        this.server.to(socketId).emit('unread_count', count);
      });
    }
  }
}
