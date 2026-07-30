import axios from 'axios';
import type { Telegraf } from 'telegraf';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function downloadTelegramFile(bot: Telegraf<any>, fileId: string): Promise<Buffer> {
  const fileLink = await bot.telegram.getFileLink(fileId);
  const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });

  return Buffer.from(response.data);
}
