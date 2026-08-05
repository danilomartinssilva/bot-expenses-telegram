package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	tb "gopkg.in/telebot.v3"

	"github.com/danilomartinssilva/bot-expenses-telegram/internal/application"
	"github.com/danilomartinssilva/bot-expenses-telegram/internal/infrastructure/ocr"
	"github.com/danilomartinssilva/bot-expenses-telegram/internal/infrastructure/session"
	"github.com/danilomartinssilva/bot-expenses-telegram/internal/infrastructure/sheets"
	"github.com/danilomartinssilva/bot-expenses-telegram/internal/infrastructure/telegram"
)

func requireEnv(name string) string {
	value := os.Getenv(name)
	if value == "" {
		log.Fatalf("missing required environment variable: %s", name)
	}
	return value
}

func main() {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Printf("warning: %v", err)
	}

	ctx := context.Background()

	repository, err := sheets.NewRepository(ctx, requireEnv("GOOGLE_SERVICE_ACCOUNT_JSON"), requireEnv("GOOGLE_SHEET_ID"))
	if err != nil {
		log.Fatalf("sheets: %v", err)
	}

	sessions := session.NewInMemory()

	rawBot, err := tb.NewBot(tb.Settings{
		Token:  requireEnv("TELEGRAM_BOT_TOKEN"),
		Poller: &tb.LongPoller{Timeout: 10 * time.Second},
	})
	if err != nil {
		log.Fatalf("telegram: %v", err)
	}

	downloader := telegram.NewFileDownloader(rawBot)

	register := &application.RegisterExpense{
		Ocr:        ocr.NewOcrService(),
		Downloader: downloader,
		Repo:       repository,
		Session:    sessions,
	}

	balance := &application.GetMonthlyBalance{Repo: repository}

	bot := telegram.NewBot(rawBot, sessions, register, balance)
	bot.Start()
}
