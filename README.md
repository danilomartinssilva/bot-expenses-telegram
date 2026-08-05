# Telegram Financial Bot

Bot do Telegram em Go que lê prints de notificações de despesas via OCR (tesseract) e salva lançamentos no Google Sheets.

## Estrutura

```text
cmd/bot/                     entrypoint (handlers, webhook/polling)
internal/domain/             entidades e regras de parse (data, valor, descrição, categoria)
internal/application/        casos de uso (RegistrarDespesa, SaldoMensal) e portas
internal/infrastructure/     adapters: google sheets, tesseract OCR, telegram, sessão em memória
```

## Configuração

1. Crie o bot no Telegram usando o `@BotFather`.
2. Ative a Google Sheets API no Google Cloud.
3. Crie uma Service Account e gere uma chave JSON.
4. Compartilhe a planilha com o e-mail da Service Account.
5. Copie `.env.example` para `.env` e preencha as variáveis.

```env
TELEGRAM_BOT_TOKEN=
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_JSON='{ "type": "service_account", ... }'
```

`GOOGLE_SERVICE_ACCOUNT_JSON` deve conter o conteúdo completo do arquivo JSON da Service Account em uma única linha.

## Rodar localmente

Requisitos: Go 1.24+, tesseract com o idioma `por` (ex.: `brew install tesseract tesseract-lang`).

```bash
CGO_ENABLED=1 \
CGO_CPPFLAGS="-I/opt/homebrew/include" \
CGO_LDFLAGS="-L/opt/homebrew/lib" \
go run ./cmd/bot
```

Sem `WEBHOOK_DOMAIN`/`RENDER_EXTERNAL_URL`, o bot roda via long polling.

## Rodar com Docker

```bash
docker build -t bot-expenses-telegram .
docker run --env-file .env -p 10000:10000 bot-expenses-telegram
```

## Regras de lançamento

- Aba de destino: mês atual em português.
- Data: detectada no print.
- Tipo: perguntado ao usuário (`Entrada`/`Saída`), padrão `Saída`.
- Categoria: detectada no texto, confirmada/alterada pelo usuário.
- Responsável: perguntado no Telegram.
- Essencial?: `Não`.
- Pago/Recebido?: `Não`.

## Colunas esperadas na aba mensal

```text
Data | Tipo | Categoria | Descrição | Responsável | Valor (R$) | Essencial? | Pago/Recebido?
```
