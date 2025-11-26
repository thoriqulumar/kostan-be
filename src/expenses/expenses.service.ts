import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { Income } from '../payments/entities/income.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { FilterExpensesDto } from './dto/filter-expenses.dto';
import { FinancialSummaryDto } from './dto/financial-summary.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(Income)
    private incomeRepository: Repository<Income>,
  ) {}

  async create(createExpenseDto: CreateExpenseDto, adminId: string): Promise<Expense> {
    const expenseDate = new Date(createExpenseDto.expenseDate);
    const expenseMonth = expenseDate.getMonth() + 1; // 1-12
    const expenseYear = expenseDate.getFullYear();

    const expense = this.expenseRepository.create({
      ...createExpenseDto,
      expenseMonth,
      expenseYear,
      recordedByAdminId: adminId,
    });

    return this.expenseRepository.save(expense);
  }

  async findAll(filterDto?: FilterExpensesDto): Promise<Expense[]> {
    const query = this.expenseRepository.createQueryBuilder('expense');

    if (filterDto?.category) {
      query.andWhere('expense.category = :category', { category: filterDto.category });
    }

    if (filterDto?.month) {
      query.andWhere('expense.expenseMonth = :month', { month: filterDto.month });
    }

    if (filterDto?.year) {
      query.andWhere('expense.expenseYear = :year', { year: filterDto.year });
    }

    query.orderBy('expense.expenseDate', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({ where: { id } });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto): Promise<Expense> {
    const expense = await this.findOne(id);

    // If expenseDate is updated, recalculate month and year
    if (updateExpenseDto.expenseDate) {
      const expenseDate = new Date(updateExpenseDto.expenseDate);
      expense.expenseMonth = expenseDate.getMonth() + 1;
      expense.expenseYear = expenseDate.getFullYear();
    }

    Object.assign(expense, updateExpenseDto);

    return this.expenseRepository.save(expense);
  }

  async remove(id: string): Promise<void> {
    const expense = await this.findOne(id);
    await this.expenseRepository.remove(expense);
  }

  // Get total expenses for a specific month and year
  async getTotalByMonthYear(month: number, year: number): Promise<number> {
    const result = await this.expenseRepository
      .createQueryBuilder('expense')
      .select('SUM(expense.amount)', 'total')
      .where('expense.expenseMonth = :month', { month })
      .andWhere('expense.expenseYear = :year', { year })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  // Get total expenses for a specific year
  async getTotalByYear(year: number): Promise<number> {
    const result = await this.expenseRepository
      .createQueryBuilder('expense')
      .select('SUM(expense.amount)', 'total')
      .where('expense.expenseYear = :year', { year })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  // Get total income for a specific month and year
  async getIncomeByMonthYear(month: number, year: number): Promise<number> {
    const result = await this.incomeRepository
      .createQueryBuilder('income')
      .select('SUM(income.amount)', 'total')
      .where('income.paymentMonth = :month', { month })
      .andWhere('income.paymentYear = :year', { year })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  // Get total income for a specific year
  async getIncomeByYear(year: number): Promise<number> {
    const result = await this.incomeRepository
      .createQueryBuilder('income')
      .select('SUM(income.amount)', 'total')
      .where('income.paymentYear = :year', { year })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  // Get financial summary (income vs expenses)
  async getFinancialSummary(month?: number, year?: number): Promise<FinancialSummaryDto> {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month;

    let totalIncome: number;
    let totalExpenses: number;
    let period: string;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (targetMonth) {
      // Get data for specific month and year
      totalIncome = await this.getIncomeByMonthYear(targetMonth, targetYear);
      totalExpenses = await this.getTotalByMonthYear(targetMonth, targetYear);
      period = `${monthNames[targetMonth - 1]} ${targetYear}`;
    } else {
      // Get data for entire year
      totalIncome = await this.getIncomeByYear(targetYear);
      totalExpenses = await this.getTotalByYear(targetYear);
      period = `${targetYear}`;
    }

    const netProfit = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      month: targetMonth,
      year: targetYear,
      period,
    };
  }
}
