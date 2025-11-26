import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { FilterExpensesDto } from './dto/filter-expenses.dto';
import { FinancialSummaryDto } from './dto/financial-summary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { UserRole } from '../users/entities/user.entity';
import { Expense } from './entities/expense.entity';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new expense (Admin only)' })
  @ApiResponse({ status: 201, description: 'Expense created successfully', type: Expense })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
    return this.expensesService.create(createExpenseDto, req.user.userId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all expenses with optional filters (Admin only)' })
  @ApiResponse({ status: 200, description: 'Expenses retrieved successfully', type: [Expense] })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  findAll(@Query() filterDto: FilterExpensesDto) {
    return this.expensesService.findAll(filterDto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get expense by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Expense retrieved successfully', type: Expense })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update expense by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Expense updated successfully', type: Expense })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  update(@Param('id') id: string, @Body() updateExpenseDto: UpdateExpenseDto) {
    return this.expensesService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete expense by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Expense deleted successfully' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  remove(@Param('id') id: string) {
    return this.expensesService.remove(id);
  }

  @Get('summary/financial')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get financial summary (income vs expenses) (Admin only)',
    description: 'Get financial summary for this month, this year, or a specific month/year. If no parameters provided, returns current year summary.'
  })
  @ApiResponse({ status: 200, description: 'Financial summary retrieved successfully', type: FinancialSummaryDto })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  getFinancialSummary(
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.expensesService.getFinancialSummary(
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }
}
