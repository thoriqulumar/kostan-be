import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentReceipt, PaymentStatus } from './entities/payment-receipt.entity';
import { Income } from './entities/income.entity';
import { Room } from '../rooms/entities/rooms.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UploadPaymentReceiptDto } from './dto/upload-payment-receipt.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { unlinkSync, existsSync } from 'fs';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentReceipt)
    private paymentReceiptRepository: Repository<PaymentReceipt>,
    @InjectRepository(Income)
    private incomeRepository: Repository<Income>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async uploadPaymentReceipt(
    userId: string,
    uploadDto: UploadPaymentReceiptDto,
    receiptFilePath: string,
  ): Promise<PaymentReceipt> {
    // Find user's rented room
    const room = await this.roomRepository.findOne({
      where: { rentedUserId: userId },
    });

    if (!room) {
      throw new NotFoundException('You are not currently renting any room');
    }

    // Create payment receipt (allow multiple uploads for the same month)
    const paymentReceipt = this.paymentReceiptRepository.create({
      userId,
      roomId: room.id,
      paymentMonth: uploadDto.paymentMonth,
      paymentYear: uploadDto.paymentYear,
      amount: uploadDto.amount,
      receiptFilePath,
      description: uploadDto.description,
      status: PaymentStatus.PENDING,
    });

    return this.paymentReceiptRepository.save(paymentReceipt);
  }

  async getUserPaymentHistory(userId: string): Promise<PaymentReceipt[]> {
    return this.paymentReceiptRepository.find({
      where: { userId },
      order: { paymentYear: 'DESC', paymentMonth: 'DESC' },
    });
  }

  async getPendingPayments(): Promise<PaymentReceipt[]> {
    return this.paymentReceiptRepository.find({
      where: { status: PaymentStatus.PENDING },
      relations: ['user', 'room'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllPayments(): Promise<PaymentReceipt[]> {
    return this.paymentReceiptRepository.find({
      relations: ['user', 'room'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPaymentById(paymentId: string): Promise<PaymentReceipt> {
    const payment = await this.paymentReceiptRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment receipt not found');
    }

    return payment;
  }

  async approvePayment(
    paymentId: string,
    adminId: string,
  ): Promise<PaymentReceipt> {
    const payment = await this.getPaymentById(paymentId);

    if (payment.status === PaymentStatus.APPROVED) {
      throw new BadRequestException('Payment has already been approved');
    }

    // Verify amount matches room price
    const room = await this.roomRepository.findOne({
      where: { id: payment.roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Update payment status
    payment.status = PaymentStatus.APPROVED;
    payment.confirmedByAdminId = adminId;
    payment.confirmedAt = new Date();

    await this.paymentReceiptRepository.save(payment);

    // Create income record
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const income = this.incomeRepository.create({
      paymentReceiptId: payment.id,
      roomId: payment.roomId,
      userId: payment.userId,
      amount: payment.amount,
      paymentMonth: payment.paymentMonth,
      paymentYear: payment.paymentYear,
      description: `Payment ${monthNames[payment.paymentMonth - 1]} ${payment.paymentYear} - ${room.name}`,
      confirmedByAdminId: adminId,
    });

    await this.incomeRepository.save(income);

    // Create notification for user (will be sent via WebSocket)
    const notifTitle = `Pembayaran disetujui`;
    const notifMessage = `Kamar: ${room.name} • Bulan: ${monthNames[payment.paymentMonth - 1]} ${payment.paymentYear} • Jumlah: Rp ${Number(payment.amount).toLocaleString('id-ID')}${payment.description ? ` • Keterangan: ${payment.description}` : ''}`;

    await this.notificationsService.createNotification(
      payment.userId,
      NotificationType.PAYMENT_APPROVED,
      notifTitle,
      notifMessage,
      payment.paymentMonth,
      payment.paymentYear,
    );

    return payment;
  }

  async rejectPayment(
    paymentId: string,
    adminId: string,
    rejectDto: RejectPaymentDto,
  ): Promise<PaymentReceipt> {
    const payment = await this.getPaymentById(paymentId);

    if (payment.status === PaymentStatus.APPROVED) {
      throw new BadRequestException('Cannot reject an approved payment');
    }

    // Update payment status
    payment.status = PaymentStatus.REJECTED;
    payment.confirmedByAdminId = adminId;
    payment.confirmedAt = new Date();
    payment.rejectionReason = rejectDto.rejectionReason;

    await this.paymentReceiptRepository.save(payment);

    // Get room details for notification
    const room = await this.roomRepository.findOne({
      where: { id: payment.roomId },
    });

    // Create notification for user (will be sent via WebSocket)
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const notifTitle = `Pembayaran ditolak`;
    const notifMessage = `Kamar: ${room?.name || '-'} • Bulan: ${monthNames[payment.paymentMonth - 1]} ${payment.paymentYear} • Jumlah: Rp ${Number(payment.amount).toLocaleString('id-ID')}${payment.description ? ` • Keterangan: ${payment.description}` : ''} • Alasan: ${rejectDto.rejectionReason}`;

    await this.notificationsService.createNotification(
      payment.userId,
      NotificationType.PAYMENT_REJECTED,
      notifTitle,
      notifMessage,
      payment.paymentMonth,
      payment.paymentYear,
    );

    return payment;
  }

  async getIncomeReport(year?: number): Promise<Income[]> {
    const query = this.incomeRepository.createQueryBuilder('income');

    if (year) {
      query.where('income.paymentYear = :year', { year });
    }

    return query
      .leftJoinAndSelect('income.user','user')
      .leftJoinAndSelect('income.room', 'room')
      .orderBy('income.paymentYear', 'DESC')
      .addOrderBy('income.paymentMonth', 'DESC')
      .getMany();
  }

  async getIncomeSummary(year?: number): Promise<{
    totalIncome: number;
    incomeByMonth: { month: number; year: number; total: number }[];
  }> {
    const query = this.incomeRepository.createQueryBuilder('income');

    if (year) {
      query.where('income.paymentYear = :year', { year });
    }

    const incomes = await query.getMany();

    const totalIncome = incomes.reduce(
      (sum, income) => sum + Number(income.amount),
      0,
    );

    const incomeByMonth = incomes.reduce((acc, income) => {
      const key = `${income.paymentYear}-${income.paymentMonth}`;
      const existing = acc.find(
        (item) =>
          item.month === income.paymentMonth &&
          item.year === income.paymentYear,
      );

      if (existing) {
        existing.total += Number(income.amount);
      } else {
        acc.push({
          month: income.paymentMonth,
          year: income.paymentYear,
          total: Number(income.amount),
        });
      }

      return acc;
    }, [] as { month: number; year: number; total: number }[]);

    return {
      totalIncome,
      incomeByMonth: incomeByMonth.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      }),
    };
  }

  async getLatestReceiptByRoomId(roomId: string): Promise<PaymentReceipt> {
    const receipt = await this.paymentReceiptRepository.findOne({
      where: { roomId },
      order: { createdAt: 'DESC' },
    });

    if (!receipt) {
      throw new NotFoundException('No payment receipt found for this room');
    }

    return receipt;
  }

  async getAllReceiptsByRoomId(roomId: string): Promise<PaymentReceipt[]> {
    const receipts = await this.paymentReceiptRepository.find({
      where: { roomId },
      order: { createdAt: 'DESC' },
    });

    if (receipts.length === 0) {
      throw new NotFoundException('No payment receipts found for this room');
    }

    return receipts;
  }

  async getReceiptById(receiptId: string): Promise<PaymentReceipt> {
    const receipt = await this.paymentReceiptRepository.findOne({
      where: { id: receiptId },
    });

    if (!receipt) {
      throw new NotFoundException('Payment receipt not found');
    }

    return receipt;
  }

  async deleteReceipt(
    receiptId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ message: string }> {
    const receipt = await this.paymentReceiptRepository.findOne({
      where: { id: receiptId },
    });

    if (!receipt) {
      throw new NotFoundException('Payment receipt not found');
    }

    // Check permissions: user can delete own receipts, admin can delete any
    if (userRole !== UserRole.ADMIN && receipt.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own payment receipts',
      );
    }

    // Don't allow deletion of approved receipts
    if (receipt.status === PaymentStatus.APPROVED) {
      throw new BadRequestException(
        'Cannot delete approved payment receipts. Please contact admin.',
      );
    }

    // Delete the file from filesystem
    if (existsSync(receipt.receiptFilePath)) {
      try {
        unlinkSync(receipt.receiptFilePath);
      } catch (error) {
        this.logger.error(`Failed to delete file: ${error.message}`);
      }
    }

    // Delete the database record
    await this.paymentReceiptRepository.remove(receipt);

    return { message: 'Payment receipt deleted successfully' };
  }
}
