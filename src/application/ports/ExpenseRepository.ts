import type { Expense } from '../../domain/entities/Expense';

export interface ExpenseRepository {
  append(sheetName: string, expense: Expense): Promise<void>;
  getMonthlyBalance(sheetName: string): Promise<string | null>;
}
