import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsSseService } from './notifications.sse';
import { SseHeartbeatScheduler } from './sse-heartbeat.scheduler';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/rooms.entity';
import { PaymentReceipt } from '../payments/entities/payment-receipt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, Room, PaymentReceipt]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '1d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsScheduler,
    NotificationsSseService,
    SseHeartbeatScheduler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule implements OnModuleInit {
  constructor(
    private notificationsService: NotificationsService,
    private sseService: NotificationsSseService,
  ) {}

  onModuleInit() {
    // Connect SSE service to notifications service
    this.notificationsService.setSseService(this.sseService);
  }
}
