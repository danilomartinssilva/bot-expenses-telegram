import http from 'http';
import type { Telegraf } from 'telegraf';

type StartWebhookServerOptions = {
  bot: Telegraf;
  port: number;
  webhookDomain: string;
};

export function startWebhookServer({ bot, port, webhookDomain }: StartWebhookServerOptions): void {
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

  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);

    bot.telegram.setWebhook(`${webhookDomain}/webhook`).then(() => {
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
}
