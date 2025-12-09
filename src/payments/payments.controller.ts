import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { UserRole } from '../users/entities/user.entity';
import { UploadPaymentReceiptDto } from './dto/upload-payment-receipt.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { createReadStream, existsSync } from 'fs';
import type { Response } from 'express';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('upload-receipt')
  @ApiOperation({ summary: 'Upload payment receipt (User only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        paymentMonth: {
          type: 'number',
          example: 10,
        },
        paymentYear: {
          type: 'number',
          example: 2025,
        },
        amount: {
          type: 'number',
          example: 1500000,
        },
        description: {
          type: 'string',
          example: 'Pembayaran sewa bulan Oktober 2025',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/payment-receipts',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `receipt-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return callback(
            new BadRequestException('Only image files (jpg, jpeg, png, gif, webp) are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadPaymentReceipt(
    @Request() req,
    @Body() uploadDto: UploadPaymentReceiptDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Receipt file is required');
    }

    const userId = req.user.userId;
    return this.paymentsService.uploadPaymentReceipt(
      userId,
      uploadDto,
      file.path,
    );
  }

  @Get('my-payments')
  @ApiOperation({ summary: 'Get user payment history (User only)' })
  async getMyPayments(@Request() req) {
    const userId = req.user.userId;
    return this.paymentsService.getUserPaymentHistory(userId);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all pending payments (Admin only)' })
  async getPendingPayments() {
    return this.paymentsService.getPendingPayments();
  }

  @Get('all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all payments (Admin only)' })
  async getAllPayments() {
    return this.paymentsService.getAllPayments();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get payment by ID (Admin only)' })
  async getPaymentById(@Param('id') id: string) {
    return this.paymentsService.getPaymentById(id);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve payment receipt (Admin only)' })
  async approvePayment(@Param('id') id: string, @Request() req) {
    const adminId = req.user.userId;
    return this.paymentsService.approvePayment(id, adminId);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject payment receipt (Admin only)' })
  async rejectPayment(
    @Param('id') id: string,
    @Request() req,
    @Body() rejectDto: RejectPaymentDto,
  ) {
    const adminId = req.user.userId;
    return this.paymentsService.rejectPayment(id, adminId, rejectDto);
  }

  @Get('receipts/room/:roomId')
  @ApiOperation({ summary: 'Get all payment receipts metadata by room ID' })
  async getAllReceiptsByRoomId(@Param('roomId') roomId: string) {
    return this.paymentsService.getAllReceiptsByRoomId(roomId);
  }

  @Get('receipt/room/:roomId/latest')
  @ApiOperation({ summary: 'Get latest payment receipt image by room ID' })
  async getLatestReceiptByRoomId(
    @Param('roomId') roomId: string,
    @Res() res: Response,
  ) {
    const receipt = await this.paymentsService.getLatestReceiptByRoomId(roomId);

    if (!existsSync(receipt.receiptFilePath)) {
      throw new BadRequestException('Receipt file not found');
    }

    const file = createReadStream(receipt.receiptFilePath);
    const fileExtension = extname(receipt.receiptFilePath).toLowerCase();

    // Set content type based on file extension
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    res.set({
      'Content-Type': contentTypeMap[fileExtension] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="receipt-${receipt.id}${fileExtension}"`,
    });

    file.pipe(res);
  }

  @Get('receipt/:id/image')
  @ApiOperation({ summary: 'Get specific payment receipt image by receipt ID' })
  async getReceiptImageById(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const receipt = await this.paymentsService.getReceiptById(id);

    if (!existsSync(receipt.receiptFilePath)) {
      throw new BadRequestException('Receipt file not found');
    }

    const file = createReadStream(receipt.receiptFilePath);
    const fileExtension = extname(receipt.receiptFilePath).toLowerCase();

    // Set content type based on file extension
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    res.set({
      'Content-Type': contentTypeMap[fileExtension] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="receipt-${receipt.id}${fileExtension}"`,
    });

    file.pipe(res);
  }

  @Delete('receipt/:id')
  @ApiOperation({ summary: 'Delete payment receipt (User can delete own, Admin can delete any)' })
  async deleteReceipt(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    const userRole = req.user.role;
    return this.paymentsService.deleteReceipt(id, userId, userRole);
  }

  @Get('income/report')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get income report (Admin only)' })
  async getIncomeReport(@Query('year') year?: number) {
    return this.paymentsService.getIncomeReport(year);
  }

  @Get('income/summary')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get income summary (Admin only)' })
  async getIncomeSummary(@Query('year') year?: number) {
    return this.paymentsService.getIncomeSummary(year);
  }
}
