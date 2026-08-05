import { getCurrentMonthSheetName } from '../../domain/constants/months';
import { formatBalanceMessage, parseExpenseFromText } from '../../domain/services/ExpenseParser';
import { MissingFieldsError } from '../errors';
import type { ExpenseRepository } from '../ports/ExpenseRepository';
import type { ExpenseSession } from '../ports/ExpenseSession';
import type { FileDownloader } from '../ports/FileDownloader';
import type { OcrService } from '../ports/OcrService';

export class RegisterExpense {
  constructor(
    private readonly ocr: OcrService,
    private readonly downloader: FileDownloader,
    private readonly repository: ExpenseRepository,
    private readonly session: ExpenseSession,
  ) {}

  async processImage(fileId: string, userId: string | number): Promise<void> {
    const imageBuffer = await this.downloader.download(fileId);
    const ocrText = await this.ocr.extractText(imageBuffer);
    const expense = parseExpenseFromText(ocrText);

    if (expense.missingFields.length) {
      throw new MissingFieldsError(expense.missingFields, ocrText);
    }

    this.session.set(userId, { expense, step: 'awaiting-responsible' });
  }

  async saveExpense(userId: string | number): Promise<string> {
    const current = this.session.require(userId);

    if (current.step !== 'awaiting-final') {
      throw new Error('Não encontrei uma despesa pendente. Envie o print novamente.');
    }

    const sheetName = getCurrentMonthSheetName();
    await this.repository.append(sheetName, current.expense);
    this.session.clear(userId);

    const balance = await this.repository.getMonthlyBalance(sheetName);

    if (balance !== null) {
      return `Despesa salva na aba ${sheetName}.\n\n${formatBalanceMessage(balance)}`;
    }

    return `Despesa salva na aba ${sheetName}.`;
  }
}
