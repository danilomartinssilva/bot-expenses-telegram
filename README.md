# Telegram Financial Bot

Bot do Telegram em Node.js que lê prints de notificações de despesas via OCR e salva lançamentos no Google Sheets.

## Configuração

1. Crie o bot no Telegram usando o `@BotFather`.
2. Ative a Google Sheets API no Google Cloud.
3. Crie uma Service Account e gere uma chave JSON.
4. Compartilhe a planilha com o e-mail da Service Account.
5. Copie `.env.example` para `.env` e preencha as variáveis.

```env
TELEGRAM_BOT_TOKEN=
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Rodar com Docker

```bash
docker compose up --build
```

## Regras de lançamento

- Aba de destino: mês atual em português.
- Data: detectada no print.
- Tipo: `Saída`.
- Responsável: perguntado no Telegram.
- Essencial?: `Não`.
- Pago/Recebido?: `Não`.

## Colunas esperadas na aba mensal

```text
Data | Tipo | Categoria | Descrição | Responsável | Valor (R$) | Essencial? | Pago/Recebido?
```
