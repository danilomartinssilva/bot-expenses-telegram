import http from 'http';
import { Telegraf, Markup } from 'telegraf';
import { telegramBotToken, responsibleOptions } from './config';
import { CATEGORIES } from './constants/categories';
import { getCurrentMonthSheetName } from './constants/months';
import { downloadTelegramFile } from './services/telegramFileService';
import { extractTextFromImage } from './services/ocrService';
import {
  parseExpenseFromText,
  formatCurrencyBRL,
  formatExpensePreview,
} from './services/expenseParserService';
import { appendExpense, getMonthlyBalance } from './services/googleSheetsService';
import {
  getSession,
  setSession,
  updateSession,
  clearSession,
} from './session/pendingExpenses';
import type { Expense, TransactionType } from './types';

const bot = new Telegraf(telegramBotToken);

function getLargestPhoto(photos: { file_id: string }[]) {
  return photos[photos.length - 1];
}

function buildInChunks<T>(items: T[], cols: number): T[][] {
  const rows: T[][] = [];

  for (let i = 0; i < items.length; i += cols) {
    rows.push(items.slice(i, i + cols));
  }

  return rows;
}

function responsibleKeyboard() {
  return Markup.inlineKeyboard(
    responsibleOptions.map((responsible) => [
      Markup.button.callback(responsible, `responsible:${responsible}`),
    ])
  );
}

function typeKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback('Entrada', 'type:Entrada'),
    Markup.button.callback('Sa\u00edda', 'type:Sa\u00edda'),
  ]);
}

function categoryKeyboard() {
  const rows = buildInChunks([...CATEGORIES], 2);

  const keyboard = rows.map((row) =>
    row.map((cat) => Markup.button.callback(cat, `category:${cat}`))
  );

  return Markup.inlineKeyboard(keyboard);
}

function valueKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback('Confirmar valor', 'value:confirm'),
    Markup.button.callback('Editar valor', 'value:edit'),
    Markup.button.callback('Cancelar', 'expense:cancel'),
  ]);
}

function descriptionKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback('Confirmar descri\u00e7\u00e3o', 'description:confirm'),
    Markup.button.callback('Editar descri\u00e7\u00e3o', 'description:edit'),
    Markup.button.callback('Cancelar', 'expense:cancel'),
  ]);
}

function confirmationKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback('Salvar', 'expense:save'),
    Markup.button.callback('Cancelar', 'expense:cancel'),
  ]);
}

function buildPreview(expense: Expense): string {
  const month = getCurrentMonthSheetName();

  return formatExpensePreview(expense, month);
}

bot.start((ctx) => {
  return ctx.reply([
    'Envie um print da notifica\u00e7\u00e3o de compra para eu tentar lan\u00e7ar a despesa na planilha.',
    '',
    'Comandos dispon\u00edveis:',
    '/saldo - consultar saldo do m\u00eas atual',
    '/help - instru\u00e7\u00f5es detalhadas',
  ].join('\n'));
});

bot.help((ctx) => {
  return ctx.reply([
    'Como usar:',
    '1. Envie uma imagem/print da despesa.',
    '2. Escolha o respons\u00e1vel.',
    '3. Escolha se \u00e9 Entrada ou Sa\u00edda.',
    '4. Confirme ou altere a categoria.',
    '5. Confirme ou edite o valor.',
    '6. Confirme ou edite a descri\u00e7\u00e3o.',
    '7. Confirme o lan\u00e7amento na planilha.',
    '',
    'Comandos:',
    '/saldo - consultar saldo do m\u00eas atual',
    '/help - estas instru\u00e7\u00f5es',
  ].join('\n'));
});

bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;

  try {
    await ctx.reply('Analisando a imagem...');

    const photo = getLargestPhoto(ctx.message.photo);
    const imageBuffer = await downloadTelegramFile(bot, photo.file_id);
    const ocrText = await extractTextFromImage(imageBuffer);
    const expense = parseExpenseFromText(ocrText);

    if (expense.missingFields.length) {
      return ctx.reply([
        `N\u00e3o consegui identificar: ${expense.missingFields.join(', ')}.`,
        'Tente enviar um print mais n\u00edtido ou mais aproximado da notifica\u00e7\u00e3o.',
        '',
        'Texto lido pelo OCR:',
        ocrText || '(vazio)',
      ].join('\n'));
    }

    clearSession(userId);
    setSession(userId, { expense, step: 'awaiting-responsible' });

    return ctx.reply('Quem \u00e9 o respons\u00e1vel por essa despesa?', responsibleKeyboard());
  } catch (error) {
    console.error(error);
    return ctx.reply('N\u00e3o consegui processar essa imagem. Tente novamente com outro print.');
  }
});

bot.action(/^responsible:(.+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const session = getSession(userId);

  if (!session || session.step !== 'awaiting-responsible') {
    await ctx.answerCbQuery();
    return ctx.reply('N\u00e3o encontrei uma despesa pendente. Envie o print novamente.');
  }

  const responsible = ctx.match[1] as Expense['responsible'];
  const updatedExpense: Expense = { ...session.expense, responsible };

  updateSession(userId, {
    expense: updatedExpense,
    step: 'awaiting-type',
  });

  await ctx.answerCbQuery();

  return ctx.reply(
    `Respons\u00e1vel: ${responsible}\n\nEsse lan\u00e7amento \u00e9 uma entrada ou sa\u00edda?`,
    typeKeyboard()
  );
});

bot.action(/^type:(Entrada|Sa\u00edda)$/, async (ctx) => {
  const userId = ctx.from.id;
  const session = getSession(userId);

  if (!session || session.step !== 'awaiting-type') {
    await ctx.answerCbQuery();
    return ctx.reply('N\u00e3o encontrei uma despesa pendente. Envie o print novamente.');
  }

  const type = ctx.match[1] as TransactionType;
  const updatedExpense: Expense = { ...session.expense, type };

  updateSession(userId, {
    expense: updatedExpense,
    step: 'awaiting-category',
  });

  await ctx.answerCbQuery();

  return ctx.reply(
    `Tipo: ${type}\n\nCategoria detectada: ${updatedExpense.category}\n\nConfirme ou escolha uma categoria:`,
    categoryKeyboard()
  );
});

bot.action(/^category:(.+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const session = getSession(userId);

  if (!session || session.step !== 'awaiting-category') {
    await ctx.answerCbQuery();
    return ctx.reply('N\u00e3o encontrei uma despesa pendente. Envie o print novamente.');
  }

  const category = ctx.match[1];
  const updatedExpense: Expense = { ...session.expense, category };

  updateSession(userId, {
    expense: updatedExpense,
    step: 'awaiting-value',
  });

  await ctx.answerCbQuery();

  return ctx.reply(
    `Categoria: ${category}\n\nValor detectado: ${formatCurrencyBRL(updatedExpense.value)}\n\nO valor est\u00e1 correto?`,
    valueKeyboard()
  );
});

bot.action('value:confirm', async (ctx) => {
  const userId = ctx.from.id;
  const session = getSession(userId);

  if (!session || session.step !== 'awaiting-value') {
    await ctx.answerCbQuery();
    return ctx.reply('N\u00e3o encontrei uma despesa pendente. Envie o print novamente.');
  }

  updateSession(userId, { step: 'awaiting-description' });

  await ctx.answerCbQuery();

  return ctx.reply(
    `Valor confirmado: ${formatCurrencyBRL(session.expense.value)}\n\nDescri\u00e7\u00e3o detectada: ${session.expense.description}\n\nDeseja manter essa descri\u00e7\u00e3o?`,
    descriptionKeyboard()
  );
});

bot.action('value:edit', async (ctx) => {
  const userId = ctx.from.id;
  const session = getSession(userId);

  if (!session || session.step !== 'awaiting-value') {
    await ctx.answerCbQuery();
    return ctx.reply('N\u00e3o encontrei uma despesa pendente. Envie o print novamente.');
  }

  updateSession(userId, { step: 'awaiting-value-edit' });

  await ctx.answerCbQuery();

  return ctx.reply('Digite o valor correto. Exemplo: 42,90');
});

bot.action('description:confirm', async (ctx) => {
  const userId = ctx.from.id;
  const session = getSession(userId);

  if (!session || session.step !== 'awaiting-description') {
    await ctx.answerCbQuery();
    return ctx.reply('N\u00e3o encontrei uma despesa pendente. Envie o print novamente.');
  }

  updateSession(userId, { step: 'awaiting-final' });

  await ctx.answerCbQuery();

  return ctx.reply(buildPreview(session.expense), confirmationKeyboard());
});

bot.action('description:edit', async (ctx) => {
  const userId = ctx.from.id;
  const session = getSession(userId);

  if (!session || session.step !== 'awaiting-description') {
    await ctx.answerCbQuery();
    return ctx.reply('N\u00e3o encontrei uma despesa pendente. Envie o print novamente.');
  }

  updateSession(userId, { step: 'awaiting-description-edit' });

  await ctx.answerCbQuery();

  return ctx.reply('Digite a nova descri\u00e7\u00e3o.\nExemplo: Mercado Extra');
});

bot.action('expense:save', async (ctx) => {
  const userId = ctx.from.id;
  const session = getSession(userId);
  const monthSheetName = getCurrentMonthSheetName();

  if (!session || session.step !== 'awaiting-final') {
    await ctx.answerCbQuery();
    return ctx.reply('N\u00e3o encontrei uma despesa pendente. Envie o print novamente.');
  }

  try {
    await appendExpense(monthSheetName, session.expense);
    clearSession(userId);

    const balance = await getMonthlyBalance(monthSheetName);

    await ctx.answerCbQuery('Despesa salva');

    if (balance !== null) {
      return ctx.reply(`Despesa salva na aba ${monthSheetName}.\n\n${formatBalanceMessage(balance)}`);
    }

    return ctx.reply(`Despesa salva na aba ${monthSheetName}.`);
  } catch (error) {
    console.error(error);
    await ctx.answerCbQuery();
    const message = error instanceof Error ? error.message : 'N\u00e3o consegui salvar a despesa no Google Sheets.';
    return ctx.reply(message);
  }
});

bot.command('saldo', async (ctx) => {
  const monthSheetName = getCurrentMonthSheetName();

  try {
    const balance = await getMonthlyBalance(monthSheetName);

    if (balance === null) {
      return ctx.reply(`N\u00e3o consegui localizar o saldo na aba ${monthSheetName}.`);
    }

    return ctx.reply(formatBalanceMessage(balance));
  } catch (error) {
    console.error(error);
    return ctx.reply('N\u00e3o consegui buscar o saldo do m\u00eas.');
  }
});

function isNegativeBalance(balance: string): boolean {
  const trimmed = balance.trim();
  return trimmed.startsWith('(') && trimmed.endsWith(')');
}

function formatBalanceMessage(balance: string): string {
  const trimmed = balance.trim();

  if (isNegativeBalance(trimmed)) {
    const clean = trimmed.replace(/[()]/g, '');
    return `Saldo do m\u00eas: -${clean}\n\nAten\u00e7\u00e3o: saldo negativo.`;
  }

  return `Saldo do m\u00eas: ${trimmed}`;
}

bot.action('expense:cancel', async (ctx) => {
  clearSession(ctx.from.id);
  await ctx.answerCbQuery('Cancelado');
  return ctx.reply('Lan\u00e7amento cancelado.');
});

bot.on('text', async (ctx) => {
  if (!ctx.message.text.startsWith('/')) {
    const userId = ctx.from.id;
    const session = getSession(userId);

    if (!session) {
      return;
    }

    if (session.step === 'awaiting-value-edit') {
      const raw = ctx.message.text.trim().replace('R$', '').replace('r$', '').trim();
      const parsed = parseEditedValue(raw);

      if (parsed === null || parsed <= 0) {
        return ctx.reply('Valor inv\u00e1lido. Digite apenas o n\u00famero. Exemplo: 42,90');
      }

      const updatedExpense: Expense = { ...session.expense, value: parsed };

      updateSession(userId, {
        expense: updatedExpense,
        step: 'awaiting-description',
      });

      return ctx.reply(
        `Valor atualizado: ${formatCurrencyBRL(parsed)}\n\nDescri\u00e7\u00e3o detectada: ${updatedExpense.description}\n\nDeseja manter essa descri\u00e7\u00e3o?`,
        descriptionKeyboard()
      );
    }

    if (session.step === 'awaiting-description-edit') {
      const text = ctx.message.text.trim();

      if (!text || text.length > 200) {
        return ctx.reply('Descri\u00e7\u00e3o inv\u00e1lida. Digite um texto de no m\u00e1ximo 200 caracteres.');
      }

      const updatedExpense: Expense = { ...session.expense, description: text };

      updateSession(userId, {
        expense: updatedExpense,
        step: 'awaiting-final',
      });

      return ctx.reply(
        `Descri\u00e7\u00e3o atualizada: ${text}\n\n${buildPreview(updatedExpense)}`,
        confirmationKeyboard()
      );
    }
  }
});

function parseEditedValue(text: string): number | null {
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

bot.catch((error: unknown) => {
  console.error('Bot error:', error);
});

const WEBHOOK_DOMAIN = process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_DOMAIN;
const PORT = Number(process.env.PORT) || 10000;

if (WEBHOOK_DOMAIN) {
  const server = http.createServer((req, res) => {
    let body = '';

    if (req.url === '/webhook' && req.method === 'POST') {
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const update = JSON.parse(body);
          bot.handleUpdate(update).catch(console.error);
        } catch {
          // ignore invalid JSON
        }
      });
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  });

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);

    bot.telegram.setWebhook(`${WEBHOOK_DOMAIN}/webhook`).then(() => {
      console.log('Webhook configured');
    }).catch(console.error);
  });

  process.once('SIGINT', () => {
    bot.stop('SIGINT');
    server.close();
  });
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    server.close();
  });
} else {
  bot.telegram.deleteWebhook().then(() => {
    bot.launch();
    console.log('Bot started via long polling');
  });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
