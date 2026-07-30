export type Responsible = 'Danilo Martins' | 'Bruna';

export type FlowStep =
  | 'awaiting-responsible'
  | 'awaiting-category'
  | 'awaiting-value'
  | 'awaiting-value-edit'
  | 'awaiting-description'
  | 'awaiting-description-edit'
  | 'awaiting-final';

export type Expense = {
  date: string;
  type: 'Sa\u00edda';
  category: string;
  description: string;
  responsible?: Responsible;
  value: number;
  essential: 'N\u00e3o';
  paidOrReceived: 'N\u00e3o';
  ocrText: string;
  missingFields: string[];
};

export type SessionData = {
  expense: Expense;
  step: FlowStep;
};
