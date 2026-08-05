import { Markup } from 'telegraf';
import { responsibleOptions } from '../../config';
import { CATEGORIES } from '../../domain/constants/categories';
import { getCurrentMonthSheetName } from '../../domain/constants/months';
import { formatCurrencyBRL, formatExpensePreview } from '../../domain/services/ExpenseParser';
import type { Expense } from '../../domain/entities/Expense';
import type { BotResponder } from '../../application/ports/BotResponder';
import type { ReplyExtra, TelegramGateway } from './TelegramGateway';

function buildInChunks<T>(items: T[], cols: number): T[][] {
  const rows: T[][] = [];

  for (let i = 0; i < items.length; i += cols) {
    rows.push(items.slice(i, i + cols));
  }

  return rows;
}

export class TelegramResponder implements BotResponder {
  constructor(private readonly gateway: TelegramGateway) {}

  async reply(text: string): Promise<void> {
    await this.gateway.reply(text);
  }

  async ack(text?: string): Promise<void> {
    await this.gateway.answerCbQuery(text);
  }

  private responsibleKeyboard(): ReplyExtra {
    return Markup.inlineKeyboard(
      responsibleOptions.map((responsible) => [
        Markup.button.callback(responsible, `responsible:${responsible}`),
      ])
    );
  }

  private typeKeyboard(): ReplyExtra {
    return Markup.inlineKeyboard([
      Markup.button.callback('Entrada', 'type:Entrada'),
      Markup.button.callback('Saída', 'type:Saída'),
    ]);
  }

  private categoryKeyboard(): ReplyExtra {
    const rows = buildInChunks([...CATEGORIES], 2);

    const keyboard = rows.map((row) =>
      row.map((cat) => Markup.button.callback(cat, `category:${cat}`))
    );

    return Markup.inlineKeyboard(keyboard);
  }

  private valueKeyboard(): ReplyExtra {
    return Markup.inlineKeyboard([
      Markup.button.callback('Confirmar valor', 'value:confirm'),
      Markup.button.callback('Editar valor', 'value:edit'),
      Markup.button.callback('Cancelar', 'expense:cancel'),
    ]);
  }

  private descriptionKeyboard(): ReplyExtra {
    return Markup.inlineKeyboard([
      Markup.button.callback('Confirmar descrição', 'description:confirm'),
      Markup.button.callback('Editar descrição', 'description:edit'),
      Markup.button.callback('Cancelar', 'expense:cancel'),
    ]);
  }

  private confirmationKeyboard(): ReplyExtra {
    return Markup.inlineKeyboard([
      Markup.button.callback('Salvar', 'expense:save'),
      Markup.button.callback('Cancelar', 'expense:cancel'),
    ]);
  }

  private buildPreview(expense: Expense): string {
    return formatExpensePreview(expense, getCurrentMonthSheetName());
  }

  async askResponsible(): Promise<void> {
    await this.gateway.reply('Quem é o responsável por essa despesa?', this.responsibleKeyboard());
  }

  async askType(expense: Expense): Promise<void> {
    await this.gateway.reply(
      `Responsável: ${expense.responsible}\n\nEsse lançamento é uma entrada ou saída?`,
      this.typeKeyboard()
    );
  }

  async askCategory(expense: Expense): Promise<void> {
    await this.gateway.reply(
      `Tipo: ${expense.type}\n\nCategoria detectada: ${expense.category}\n\nConfirme ou escolha uma categoria:`,
      this.categoryKeyboard()
    );
  }

  async askValue(expense: Expense): Promise<void> {
    await this.gateway.reply(
      `Categoria: ${expense.category}\n\nValor detectado: ${formatCurrencyBRL(expense.value)}\n\nO valor está correto?`,
      this.valueKeyboard()
    );
  }

  async askDescription(expense: Expense): Promise<void> {
    await this.gateway.reply(
      `Valor confirmado: ${formatCurrencyBRL(expense.value)}\n\nDescrição detectada: ${expense.description}\n\nDeseja manter essa descrição?`,
      this.descriptionKeyboard()
    );
  }

  async askValueEdit(): Promise<void> {
    await this.gateway.reply('Digite o valor correto. Exemplo: 42,90');
  }

  async askDescriptionEdit(): Promise<void> {
    await this.gateway.reply('Digite a nova descrição.\nExemplo: Mercado Extra');
  }

  async showValueUpdated(expense: Expense): Promise<void> {
    await this.gateway.reply(
      `Valor atualizado: ${formatCurrencyBRL(expense.value)}\n\nDescrição detectada: ${expense.description}\n\nDeseja manter essa descrição?`,
      this.descriptionKeyboard()
    );
  }

  async showDescriptionUpdated(expense: Expense): Promise<void> {
    await this.gateway.reply(
      `Descrição atualizada: ${expense.description}\n\n${this.buildPreview(expense)}`,
      this.confirmationKeyboard()
    );
  }

  async showPreview(expense: Expense): Promise<void> {
    await this.gateway.reply(this.buildPreview(expense), this.confirmationKeyboard());
  }
}
