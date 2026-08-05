package telegram

import (
	"context"
	"fmt"
	"io"

	tb "gopkg.in/telebot.v3"
)

type FileDownloader struct {
	bot *tb.Bot
}

func NewFileDownloader(bot *tb.Bot) *FileDownloader {
	return &FileDownloader{bot: bot}
}

func (d *FileDownloader) Download(ctx context.Context, fileID string) ([]byte, error) {
	file, err := d.bot.FileByID(fileID)
	if err != nil {
		return nil, fmt.Errorf("telegram: get file: %w", err)
	}

	reader, err := d.bot.File(&file)
	if err != nil {
		return nil, fmt.Errorf("telegram: open file: %w", err)
	}
	defer reader.Close()

	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("telegram: read file: %w", err)
	}

	return data, nil
}
