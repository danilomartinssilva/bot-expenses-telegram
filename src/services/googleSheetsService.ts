import { google } from 'googleapis';
import { googlePrivateKey, googleServiceAccountEmail, googleSheetId } from '../config';
import type { Expense } from '../types';

function createSheetsClient() {
  const auth = new google.auth.JWT({
    email: googleServiceAccountEmail,
    key: googlePrivateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

export async function sheetExists(sheetName: string): Promise<boolean> {
  const sheets = createSheetsClient();
  const response = await sheets.spreadsheets.get({ spreadsheetId: googleSheetId });

  return (response.data.sheets ?? []).some((sheet) => sheet.properties?.title === sheetName);
}

const FIRST_EXPENSE_ROW = 4;

function isEmptyRow(row: unknown[]): boolean {
  return row.every((cell) => cell === undefined || cell === null || String(cell).trim() === '');
}

export async function appendExpense(sheetName: string, expense: Expense): Promise<void> {
  const exists = await sheetExists(sheetName);

  if (!exists) {
    throw new Error(`A aba ${sheetName} n\u00e3o existe na planilha.`);
  }

  const sheets = createSheetsClient();
  const values: (string | number)[][] = [[
    expense.date,
    expense.type,
    expense.category,
    expense.description,
    expense.responsible || '',
    expense.value,
    expense.essential,
    expense.paidOrReceived,
  ]];

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: googleSheetId,
    range: `'${sheetName}'!A${FIRST_EXPENSE_ROW}:H`,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const existingRows = existing.data.values ?? [];
  const emptyIndex = existingRows.findIndex((row) => isEmptyRow(row));
  const targetRow = emptyIndex >= 0
    ? FIRST_EXPENSE_ROW + emptyIndex
    : FIRST_EXPENSE_ROW + existingRows.length;

  await sheets.spreadsheets.values.update({
    spreadsheetId: googleSheetId,
    range: `'${sheetName}'!A${targetRow}:H${targetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function getMonthlyBalance(sheetName: string): Promise<string | null> {
  const sheets = createSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: googleSheetId,
    range: `'${sheetName}'`,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const rows = response.data.values ?? [];

  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cell = String(row[i]).trim().toLowerCase();

      if (cell.includes('saldo')) {
        const value = row[i + 1];

        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value);
        }
      }
    }
  }

  return null;
}
