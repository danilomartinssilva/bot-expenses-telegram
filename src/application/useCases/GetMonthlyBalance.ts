import { getCurrentMonthSheetName } from '../../domain/constants/months';
import { formatBalanceMessage } from '../../domain/services/ExpenseParser';
import type { ExpenseRepository } from '../ports/ExpenseRepository';

export class GetMonthlyBalance {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(): Promise<string> {
    const sheetName = getCurrentMonthSheetName();
    const balance = await this.repository.getMonthlyBalance(sheetName);

    if (balance === null) {
      return `Não consegui localizar o saldo na aba ${sheetName}.`;
    }

    return formatBalanceMessage(balance);
  }
}
