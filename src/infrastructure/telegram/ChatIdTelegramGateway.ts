import type { Telegraf } from 'telegraf';
import type { ReplyExtra, TelegramGateway } from './TelegramGateway';

export class ChatIdTelegramGateway implements TelegramGateway {
  constructor(
    private readonly bot: Telegraf,
    private readonly chatId: number,
  ) {}

  reply(text: string, extra?: ReplyExtra): Promise<unknown> {
    return this.bot.telegram.sendMessage(this.chatId, text, extra);
  }

  answerCbQuery(): Promise<unknown> {
    return Promise.resolve(true);
  }
}
