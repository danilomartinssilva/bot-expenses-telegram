import dotenv from 'dotenv';
import type { Responsible } from './domain/entities/Expense';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const googlePrivateKey = requireEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');

export const telegramBotToken = requireEnv('TELEGRAM_BOT_TOKEN');
export const googleSheetId = requireEnv('GOOGLE_SHEET_ID');
export const googleServiceAccountEmail = requireEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
export { googlePrivateKey };
export const configSheetName = 'Configurações';
export const responsibleOptions: Responsible[] = ['Danilo Martins', 'Bruna'];
