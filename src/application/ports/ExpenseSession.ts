import type { Expense } from '../../domain/entities/Expense';

export type FlowStep =
  | 'awaiting-responsible'
  | 'awaiting-type'
  | 'awaiting-category'
  | 'awaiting-value'
  | 'awaiting-value-edit'
  | 'awaiting-description'
  | 'awaiting-description-edit'
  | 'awaiting-final';

export type SessionData = {
  expense: Expense;
  step: FlowStep;
};

export interface ExpenseSession {
  get(userId: string | number): SessionData | undefined;
  require(userId: string | number): SessionData;
  set(userId: string | number, data: SessionData): void;
  update(userId: string | number, partial: Partial<SessionData>): void;
  clear(userId: string | number): void;
}
