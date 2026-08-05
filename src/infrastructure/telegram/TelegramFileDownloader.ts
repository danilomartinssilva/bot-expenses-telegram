import axios from 'axios';
import type { Telegraf } from 'telegraf';
import type { FileDownloader } from '../../application/ports/FileDownloader';

export class TelegramFileDownloader implements FileDownloader {
  constructor(private readonly bot: Telegraf) {}

  async download(fileId: string): Promise<Buffer> {
    const fileLink = await this.bot.telegram.getFileLink(fileId);
    const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });

    return Buffer.from(response.data);
  }
}
