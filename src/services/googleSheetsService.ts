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

  await sheets.spreadsheets.values.append({
    spreadsheetId: googleSheetId,
    range: `'${sheetName}'!A:H`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
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
