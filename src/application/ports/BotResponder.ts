import type { Expense } from '../../domain/entities/Expense';

export interface BotResponder {
  reply(text: string): Promise<void>;
  ack(text?: string): Promise<void>;
  askResponsible(): Promise<void>;
  askType(expense: Expense): Promise<void>;
  askCategory(expense: Expense): Promise<void>;
  askValue(expense: Expense): Promise<void>;
  askDescription(expense: Expense): Promise<void>;
  askValueEdit(): Promise<void>;
  askDescriptionEdit(): Promise<void>;
  showValueUpdated(expense: Expense): Promise<void>;
  showDescriptionUpdated(expense: Expense): Promise<void>;
  showPreview(expense: Expense): Promise<void>;
}
