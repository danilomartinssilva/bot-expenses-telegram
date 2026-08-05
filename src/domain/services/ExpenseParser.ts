import { CATEGORIES } from '../constants/categories';
import type { Expense } from '../entities/Expense';

const GENERIC_LINES = [
  'compra',
  'aprovada',
  'cartao',
  'cartão',
  'credito',
  'crédito',
  'debito',
  'débito',
  'notificacao',
  'notificação',
  'r$',
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Moradia: ['aluguel', 'condominio', 'condomínio', 'financiamento', 'imovel', 'imóvel', 'casa'],
  Alimentação: ['ifood', 'restaurante', 'mercado', 'padaria', 'lanchonete', 'burger', 'pizza', 'supermercado'],
  Transporte: ['uber', '99', 'posto', 'combustivel', 'combustível', 'gasolina', 'estacionamento', 'metro', 'metrô'],
  Saúde: ['farmacia', 'farmácia', 'drogaria', 'hospital', 'clinica', 'clínica', 'medico', 'médico'],
  Telefonia: ['claro', 'vivo', 'tim', 'oi', 'telefone', 'internet', 'fibra'],
  'Cartão de Crédito': ['cartao', 'cartão', 'fatura', 'credito', 'crédito', 'nubank', 'itaucard'],
  Dívidas: ['emprestimo', 'empréstimo', 'parcela', 'limite', 'financiamento'],
  Investimentos: ['investimento', 'tesouro', 'cdb', 'renda fixa', 'acoes', 'ações'],
};

function normalize(text: string): string {
  return text.toLowerCase();
}

function detectCategory(text: string): string {
  const normalizedText = normalize(text || '');

  for (const category of CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category] || [];

    if (keywords.some((keyword) => normalizedText.includes(keyword))) {
      return category;
    }
  }

  return 'Outros';
}

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
    type: 'Saída',
    category,
    description,
    value: value || 0,
    essential: 'Não',
    paidOrReceived: 'Não',
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
    `Descrição: ${expense.description}`,
    `Responsável: ${expense.responsible}`,
    `Valor: ${formatCurrencyBRL(expense.value)}`,
    `Essencial?: ${expense.essential}`,
    `Pago/Recebido?: ${expense.paidOrReceived}`,
    '',
    `Salvar na aba ${monthSheetName}?`,
  ].join('\n');
}

export function parseEditedValue(text: string): number | null {
  const clean = text.replace(/\./g, '').replace(',', '.').trim();
  const number = Number(clean);

  if (Number.isFinite(number) && number > 0) {
    return number;
  }

  const alt = text.replace(',', '.').trim();
  const altNumber = Number(alt);

  if (Number.isFinite(altNumber) && altNumber > 0) {
    return altNumber;
  }

  return null;
}

function isNegativeBalance(balance: string): boolean {
  const trimmed = balance.trim();
  return trimmed.startsWith('(') && trimmed.endsWith(')');
}

export function formatBalanceMessage(balance: string): string {
  const trimmed = balance.trim();

  if (isNegativeBalance(trimmed)) {
    const clean = trimmed.replace(/[()]/g, '');
    return `Saldo do mês: -${clean}\n\nAtenção: saldo negativo.`;
  }

  return `Saldo do mês: ${trimmed}`;
}
