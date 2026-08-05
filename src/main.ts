import { Telegraf } from 'telegraf';
import type { Context } from 'telegraf';
import { telegramBotToken } from './config';
import { MissingFieldsError } from './application/errors';
import type { BotResponder } from './application/ports/BotResponder';
import { GetMonthlyBalance } from './application/useCases/GetMonthlyBalance';
import { RegisterExpense } from './application/useCases/RegisterExpense';
import { parseEditedValue } from './domain/services/ExpenseParser';
import type { Expense, TransactionType } from './domain/entities/Expense';
import { TesseractOcrService } from './infrastructure/ocr/TesseractOcrService';
import { InMemoryExpenseSession } from './infrastructure/session/InMemoryExpenseSession';
import { GoogleSheetsExpenseRepository } from './infrastructure/sheets/GoogleSheetsExpenseRepository';
import { TelegramFileDownloader } from './infrastructure/telegram/TelegramFileDownloader';
import { TelegramResponder } from './infrastructure/telegram/TelegramResponder';
import { startWebhookServer } from './infrastructure/telegram/WebhookServer';

const bot = new Telegraf(telegramBotToken);

const sessionStore = new InMemoryExpenseSession();
const ocr = new TesseractOcrService();
const downloader = new TelegramFileDownloader(bot);
const repository = new GoogleSheetsExpenseRepository();

const registerExpense = new RegisterExpense(ocr, downloader, repository, sessionStore);
const getMonthlyBalance = new GetMonthlyBalance(repository);

function responderFor(ctx: Context): BotResponder {
  return new TelegramResponder(ctx);
}

function getLargestPhoto(photos: { file_id: string }[]) {
  return photos[photos.length - 1];
}

async function handleMissingSession(responder: BotResponder): Promise<void> {
  await responder.ack();
  await responder.reply('Não encontrei uma despesa pendente. Envie o print novamente.');
}

bot.start((ctx) => {
  const responder = responderFor(ctx);

  return responder.reply([
    'Envie um print da notificação de compra para eu tentar lançar a despesa na planilha.',
    '',
    'Comandos disponíveis:',
    '/saldo - consultar saldo do mês atual',
    '/help - instruções detalhadas',
  ].join('\n'));
});

bot.help((ctx) => {
  const responder = responderFor(ctx);

  return responder.reply([
    'Como usar:',
    '1. Envie uma imagem/print da despesa.',
    '2. Escolha o responsável.',
    '3. Escolha se é Entrada ou Saída.',
    '4. Confirme ou altere a categoria.',
    '5. Confirme ou edite o valor.',
    '6. Confirme ou edite a descrição.',
    '7. Confirme o lançamento na planilha.',
    '',
    'Comandos:',
    '/saldo - consultar saldo do mês atual',
    '/help - estas instruções',
  ].join('\n'));
});

bot.on('photo', async (ctx) => {
  const responder = responderFor(ctx);

  try {
    await responder.reply('Analisando a imagem...');

    const photo = getLargestPhoto(ctx.message.photo);
    await registerExpense.processImage(photo.file_id, ctx.from.id);

    return responder.askResponsible();
  } catch (error) {
    if (error instanceof MissingFieldsError) {
      return responder.reply(error.message);
    }

    console.error(error);
    return responder.reply('Não consegui processar essa imagem. Tente novamente com outro print.');
  }
});

bot.action(/^responsible:(.+)$/, async (ctx) => {
  const responder = responderFor(ctx);
  const current = sessionStore.get(ctx.from.id);

  if (!current || current.step !== 'awaiting-responsible') {
    return handleMissingSession(responder);
  }

  const expense: Expense = { ...current.expense, responsible: ctx.match[1] as Expense['responsible'] };
  sessionStore.update(ctx.from.id, { expense, step: 'awaiting-type' });

  await responder.ack();
  return responder.askType(expense);
});

bot.action(/^type:(Entrada|Saída)$/, async (ctx) => {
  const responder = responderFor(ctx);
  const current = sessionStore.get(ctx.from.id);

  if (!current || current.step !== 'awaiting-type') {
    return handleMissingSession(responder);
  }

  const expense: Expense = { ...current.expense, type: ctx.match[1] as TransactionType };
  sessionStore.update(ctx.from.id, { expense, step: 'awaiting-category' });

  await responder.ack();
  return responder.askCategory(expense);
});

bot.action(/^category:(.+)$/, async (ctx) => {
  const responder = responderFor(ctx);
  const current = sessionStore.get(ctx.from.id);

  if (!current || current.step !== 'awaiting-category') {
    return handleMissingSession(responder);
  }

  const expense: Expense = { ...current.expense, category: ctx.match[1] };
  sessionStore.update(ctx.from.id, { expense, step: 'awaiting-value' });

  await responder.ack();
  return responder.askValue(expense);
});

bot.action('value:confirm', async (ctx) => {
  const responder = responderFor(ctx);
  const current = sessionStore.get(ctx.from.id);

  if (!current || current.step !== 'awaiting-value') {
    return handleMissingSession(responder);
  }

  sessionStore.update(ctx.from.id, { step: 'awaiting-description' });

  await responder.ack();
  return responder.askDescription(current.expense);
});

bot.action('value:edit', async (ctx) => {
  const responder = responderFor(ctx);
  const current = sessionStore.get(ctx.from.id);

  if (!current || current.step !== 'awaiting-value') {
    return handleMissingSession(responder);
  }

  sessionStore.update(ctx.from.id, { step: 'awaiting-value-edit' });

  await responder.ack();
  return responder.askValueEdit();
});

bot.action('description:confirm', async (ctx) => {
  const responder = responderFor(ctx);
  const current = sessionStore.get(ctx.from.id);

  if (!current || current.step !== 'awaiting-description') {
    return handleMissingSession(responder);
  }

  sessionStore.update(ctx.from.id, { step: 'awaiting-final' });

  await responder.ack();
  return responder.showPreview(current.expense);
});

bot.action('description:edit', async (ctx) => {
  const responder = responderFor(ctx);
  const current = sessionStore.get(ctx.from.id);

  if (!current || current.step !== 'awaiting-description') {
    return handleMissingSession(responder);
  }

  sessionStore.update(ctx.from.id, { step: 'awaiting-description-edit' });

  await responder.ack();
  return responder.askDescriptionEdit();
});

bot.action('expense:save', async (ctx) => {
  const responder = responderFor(ctx);

  try {
    const message = await registerExpense.saveExpense(ctx.from.id);
    await responder.ack('Despesa salva');
    return responder.reply(message);
  } catch (error) {
    console.error(error);
    await responder.ack();
    const message = error instanceof Error ? error.message : 'Não consegui salvar a despesa no Google Sheets.';
    return responder.reply(message);
  }
});

bot.action('expense:cancel', async (ctx) => {
  const responder = responderFor(ctx);
  sessionStore.clear(ctx.from.id);
  await responder.ack('Cancelado');
  return responder.reply('Lançamento cancelado.');
});

bot.command('saldo', async (ctx) => {
  const responder = responderFor(ctx);

  try {
    return responder.reply(await getMonthlyBalance.execute());
  } catch (error) {
    console.error(error);
    return responder.reply('Não consegui buscar o saldo do mês.');
  }
});

bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) {
    return;
  }

  const responder = responderFor(ctx);
  const current = sessionStore.get(ctx.from.id);

  if (!current) {
    return;
  }

  if (current.step === 'awaiting-value-edit') {
    const raw = ctx.message.text.trim().replace('R$', '').replace('r$', '').trim();
    const parsed = parseEditedValue(raw);

    if (parsed === null || parsed <= 0) {
      return responder.reply('Valor inválido. Digite apenas o número. Exemplo: 42,90');
    }

    const expense: Expense = { ...current.expense, value: parsed };
    sessionStore.update(ctx.from.id, { expense, step: 'awaiting-description' });

    return responder.showValueUpdated(expense);
  }

  if (current.step === 'awaiting-description-edit') {
    const text = ctx.message.text.trim();

    if (!text || text.length > 200) {
      return responder.reply('Descrição inválida. Digite um texto de no máximo 200 caracteres.');
    }

    const expense: Expense = { ...current.expense, description: text };
    sessionStore.update(ctx.from.id, { expense, step: 'awaiting-final' });

    return responder.showDescriptionUpdated(expense);
  }
});

bot.catch((error: unknown) => {
  console.error('Bot error:', error);
});

const WEBHOOK_DOMAIN = process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_DOMAIN;
const PORT = Number(process.env.PORT) || 10000;

if (WEBHOOK_DOMAIN) {
  startWebhookServer({ bot, port: PORT, webhookDomain: WEBHOOK_DOMAIN });
} else {
  bot.telegram.deleteWebhook().then(() => {
    bot.launch();
    console.log('Bot started via long polling');
  });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
