import type { Expense } from '../types';
import { detectCategory } from './categoryDetectorService';

const GENERIC_LINES = [
  'compra',
  'aprovada',
  'cartao',
  'cart\u00e3o',
  'credito',
  'cr\u00e9dito',
  'debito',
  'd\u00e9bito',
  'notificacao',
  'notifica\u00e7\u00e3o',
  'r$',
];

function parseDate(text: string): string | null {
  const dateMatch = text.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);

  if (!dateMatch) {
    return null;
  }

  const day = dateMatch[1].padStart(2, '0');
  const month = dateMatch[2].padStart(2, '0');
  const currentYear = new Date().getFullYear();
  let year = dateMatch[3] || String(currentYear);

  if (year.length === 2) {
    year = `20${year}`;
  }

  return `${day}/${month}/${year}`;
}

function parseValue(text: string): number | null {
  const matches = [...text.matchAll(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})\b/g)];

  if (!matches.length) {
    return null;
  }

  const values = matches
    .map((match) => {
      const raw = match[1];
      const normalized = raw.includes(',')
        ? raw.replace(/\./g, '').replace(',', '.')
        : raw;

      return {
        raw,
        amount: Number(normalized),
      };
    })
    .filter((item) => Number.isFinite(item.amount));

  if (!values.length) {
    return null;
  }

  values.sort((a, b) => b.amount - a.amount);
  return values[0].amount;
}

function parseDescription(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/\d{1,2}[\/.-]\d{1,2}/.test(line))
    .filter((line) => !/(?:R\$\s*)?\d+[,.]\d{2}/.test(line));

  const usefulLine = lines.find((line) => {
    const normalized = line.toLowerCase();
    return !GENERIC_LINES.some((generic) => normalized.includes(generic));
  });

  return usefulLine || lines[0] || 'Despesa via OCR';
}

export function parseExpenseFromText(ocrText: string): Expense {
  const date = parseDate(ocrText);
  const value = parseValue(ocrText);
  const description = parseDescription(ocrText);
  const category = detectCategory(`${description}\n${ocrText}`);

  const missingFields: string[] = [];

  if (!date) {
    missingFields.push('data');
  }

  if (!value) {
    missingFields.push('valor');
  }

  return {
    date: date || '',
    type: 'Sa\u00edda',
    category,
    description,
    value: value || 0,
    essential: 'N\u00e3o',
    paidOrReceived: 'N\u00e3o',
    ocrText,
    missingFields,
  };
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatExpensePreview(expense: Expense, monthSheetName: string): string {
  return [
    'Despesa identificada:',
    '',
    `Data: ${expense.date}`,
    `Tipo: ${expense.type}`,
    `Categoria: ${expense.category}`,
    `Descri\u00e7\u00e3o: ${expense.description}`,
    `Respons\u00e1vel: ${expense.responsible}`,
    `Valor: ${formatCurrencyBRL(expense.value)}`,
    `Essencial?: ${expense.essential}`,
    `Pago/Recebido?: ${expense.paidOrReceived}`,
    '',
    `Salvar na aba ${monthSheetName}?`,
  ].join('\n');
}
