export type Responsible = 'Danilo Martins' | 'Bruna';
export type TransactionType = 'Entrada' | 'Saída';

export type Expense = {
  date: string;
  type: TransactionType;
  category: string;
  description: string;
  responsible?: Responsible;
  value: number;
  essential: 'Não';
  paidOrReceived: 'Não';
  ocrText: string;
  missingFields: string[];
};
