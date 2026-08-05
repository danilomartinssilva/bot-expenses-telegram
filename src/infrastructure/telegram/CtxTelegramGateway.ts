import type { Context } from 'telegraf';
import type { ReplyExtra, TelegramGateway } from './TelegramGateway';

export class CtxTelegramGateway implements TelegramGateway {
  constructor(private readonly ctx: Context) {}

  reply(text: string, extra?: ReplyExtra): Promise<unknown> {
    return this.ctx.reply(text, extra);
  }

  answerCbQuery(text?: string): Promise<unknown> {
    return this.ctx.answerCbQuery(text);
  }
}
