import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/rooms.entity';
import { PaymentReceipt, PaymentStatus } from '../payments/entities/payment-receipt.entity';
import { ConfigService } from '@nestjs/config';
// Email notifications disabled
// import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  // Email notifications disabled
  // private transporter: nodemailer.Transporter;
  private sseService: any; // Will be set by the module

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(PaymentReceipt)
    private paymentReceiptRepository: Repository<PaymentReceipt>,
    private configService: ConfigService,
  ) {
    // Email notifications disabled
    /*
    // Initialize email transporter
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    console.log({smtpHost, smtpPort, smtpUser, smtpPass})
    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: this.configService.get<boolean>('SMTP_SECURE') || false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      console.log({transporter: this.transporter})

      this.logger.log('Email transporter initialized');
    } else {
      this.logger.warn(
        'Email configuration not found. Email notifications will be disabled.',
      );
    }
    */
  }

  async sendPaymentReminders(): Promise<void> {
    this.logger.log('Starting payment reminder check...');

    // Get all users who are currently renting a room
    const rentedRooms = await this.roomRepository.find({
      where: { isActive: true },
      relations: ['rentedUser'],
    });

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();
    const currentDay = currentDate.getDate();

    for (const room of rentedRooms) {
      if (!room.rentedUser || !room.rentStartDate) {
        continue;
      }

      const rentStartDate = new Date(room.rentStartDate);
      const rentStartDay = rentStartDate.getDate();

      // Check if today matches this user's rent start day
      // Each user gets reminder on their individual rent start date day each month
      if (currentDay != rentStartDay) {
        this.logger.debug(
          `Skipping ${room.rentedUser.email}: Today is ${currentDay}, rent day is ${rentStartDay}`,
        );
        continue;
      }

      // Check if user has already paid for this month
      const existingPayment = await this.paymentReceiptRepository.findOne({
        where: {
          userId: room.rentedUserId,
          roomId: room.id,
          paymentMonth: currentMonth,
          paymentYear: currentYear,
          status: PaymentStatus.APPROVED,
        },
      });

      if (existingPayment) {
        this.logger.log(
          `User ${room.rentedUser.email} has already paid for ${currentMonth}/${currentYear}`,
        );
        continue;
      }

      // Check if we already sent a reminder for this month
      const existingNotification = await this.notificationRepository.findOne({
        where: {
          userId: room.rentedUserId,
          type: NotificationType.PAYMENT_REMINDER,
          paymentMonth: currentMonth,
          paymentYear: currentYear,
        },
      });

      if (existingNotification) {
        this.logger.log(
          `Reminder already sent to ${room.rentedUser.email} for ${currentMonth}/${currentYear}`,
        );
        continue;
      }

      // Send payment reminder
      await this.sendPaymentReminder(
        room.rentedUser,
        room,
        currentMonth,
        currentYear,
        rentStartDay,
      );
    }

    this.logger.log('Payment reminder check completed');
  }

  private async sendPaymentReminder(
    user: User,
    room: Room,
    month: number,
    year: number,
    rentStartDay: number,
  ): Promise<void> {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const title = `Pengingat pembayaran kost ${monthNames[month - 1]}`;
    const message = `Kamar: ${room.name} • Bulan: ${monthNames[month - 1]} ${year} • Jumlah: Rp ${room.price.toLocaleString('id-ID')}`;

    // Create notification in database (will be sent via WebSocket)
    const notification = await this.createNotification(
      user.id,
      NotificationType.PAYMENT_REMINDER,
      title,
      message,
      month,
      year,
    );

    // Email notifications disabled
    /*
    // Send email if configured
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.configService.get<string>('EMAIL_FROM'),
          to: user.email,
          subject: title,
          html: `
            <h2>Payment Reminder</h2>
            <p>Hi ${user.fullName},</p>
            <p>${message}</p>
            <p>Tolong upload bukti pembayaran via website setelah pembayaran selesai dilakukan.</p>
            <br>
            <p>Terima kasih!</p>
          `,
        });

        // Update notification as email sent
        await this.notificationRepository.update(notification.id, {
          emailSent: true,
          emailSentAt: new Date(),
        });

        this.logger.log(`Payment reminder sent to ${user.email}`);
      } catch (error) {
        this.logger.error(
          `Failed to send email to ${user.email}: ${error.message}`,
        );
      }
    } else {
      this.logger.log(
        `Notification created for ${user.email} (email disabled)`,
      );
    }
    */
    this.logger.log(
      `Notification created for ${user.email} (email notifications disabled)`,
    );
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId, isRead: false },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, userId },
      { isRead: true },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  // Method to set the SSE service (called by the module on init)
  setSseService(sseService: any) {
    this.sseService = sseService;
  }

  // Method to create a notification and emit it via SSE
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    paymentMonth?: number,
    paymentYear?: number,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.save({
      userId,
      type,
      title,
      message,
      paymentMonth,
      paymentYear,
      isRead: false,
    });

    // Emit notification via SSE if service is available
    if (this.sseService) {
      this.sseService.sendNotificationToUser(userId, notification);

      // Also send updated unread count
      const unreadCount = await this.notificationRepository.count({
        where: { userId, isRead: false },
      });
      this.sseService.sendUnreadCountToUser(userId, unreadCount);
    }

    return notification;
  }
}
