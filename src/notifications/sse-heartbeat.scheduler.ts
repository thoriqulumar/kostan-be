import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsSseService } from './notifications.sse';

@Injectable()
export class SseHeartbeatScheduler {
  private readonly logger = new Logger(SseHeartbeatScheduler.name);

  constructor(private readonly sseService: NotificationsSseService) {}

  /**
   * Send heartbeat every 30 seconds to keep SSE connections alive
   * This prevents proxy/load balancer timeouts
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  handleHeartbeat() {
    const activeClients = this.sseService.getActiveClientsCount();
    if (activeClients > 0) {
      this.sseService.sendHeartbeat();
    }
  }
}
