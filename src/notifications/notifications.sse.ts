import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

export interface SseClient {
  userId: string;
  response: Response;
  lastEventId?: string;
}

@Injectable()
export class NotificationsSseService {
  private readonly logger = new Logger(NotificationsSseService.name);
  private clients: Map<string, Set<Response>> = new Map(); // userId -> Set of Response objects

  constructor(private jwtService: JwtService) {}

  /**
   * Add a new SSE client connection
   */
  addClient(userId: string, response: Response): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(response);

    this.logger.log(`SSE client connected for user: ${userId}. Total clients: ${this.clients.get(userId)!.size}`);

    // Handle client disconnect
    response.on('close', () => {
      this.removeClient(userId, response);
    });
  }

  /**
   * Remove a disconnected client
   */
  private removeClient(userId: string, response: Response): void {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(response);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
      this.logger.log(`SSE client disconnected for user: ${userId}`);
    }
  }

  /**
   * Send a notification to a specific user
   */
  sendNotificationToUser(userId: string, notification: any): void {
    const userClients = this.clients.get(userId);
    if (userClients && userClients.size > 0) {
      const event: MessageEvent = {
        type: 'notification',
        data: notification,
      };

      userClients.forEach((response) => {
        try {
          response.write(`event: notification\n`);
          response.write(`data: ${JSON.stringify(notification)}\n\n`);
        } catch (error) {
          this.logger.error(`Failed to send notification to user ${userId}: ${error.message}`);
          this.removeClient(userId, response);
        }
      });

      this.logger.log(`Notification sent to user ${userId} (${userClients.size} clients)`);
    } else {
      this.logger.debug(`No active SSE clients for user ${userId}`);
    }
  }

  /**
   * Send unread count update to a specific user
   */
  sendUnreadCountToUser(userId: string, count: number): void {
    const userClients = this.clients.get(userId);
    if (userClients && userClients.size > 0) {
      userClients.forEach((response) => {
        try {
          response.write(`event: unread_count\n`);
          response.write(`data: ${JSON.stringify({ count })}\n\n`);
        } catch (error) {
          this.logger.error(`Failed to send unread count to user ${userId}: ${error.message}`);
          this.removeClient(userId, response);
        }
      });

      this.logger.log(`Unread count sent to user ${userId}: ${count}`);
    }
  }

  /**
   * Send a ping/heartbeat to keep connections alive
   */
  sendHeartbeat(): void {
    let totalClients = 0;
    this.clients.forEach((userClients, userId) => {
      userClients.forEach((response) => {
        try {
          response.write(`:heartbeat\n\n`);
          totalClients++;
        } catch (error) {
          this.logger.error(`Heartbeat failed for user ${userId}: ${error.message}`);
          this.removeClient(userId, response);
        }
      });
    });

    if (totalClients > 0) {
      this.logger.debug(`Heartbeat sent to ${totalClients} clients`);
    }
  }

  /**
   * Get the number of active clients
   */
  getActiveClientsCount(): number {
    let count = 0;
    this.clients.forEach((userClients) => {
      count += userClients.size;
    });
    return count;
  }

  /**
   * Verify JWT token from query or header
   */
  verifyToken(token: string): any {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
