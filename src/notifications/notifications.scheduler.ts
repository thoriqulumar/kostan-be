import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handlePaymentReminders() {
    this.logger.log('Running daily payment reminder check...');

    try {
      await this.notificationsService.sendPaymentReminders();
      this.logger.log('Payment reminder check completed successfully');
    } catch (error) {
      this.logger.error(
        `Failed to send payment reminders: ${error.message}`,
        error.stack,
      );
    }
  }

  // Optional: You can also add a manual trigger for testing
  // This can be called via an admin endpoint if needed
  async triggerManualCheck() {
    this.logger.log('Manual payment reminder check triggered');
    await this.notificationsService.sendPaymentReminders();
  }
}
