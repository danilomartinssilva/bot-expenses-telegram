import type { Types } from 'telegraf';

export type ReplyExtra = Types.ExtraReplyMessage;

export interface TelegramGateway {
  reply(text: string, extra?: ReplyExtra): Promise<unknown>;
  answerCbQuery(text?: string): Promise<unknown>;
}
