package application

import (
	"context"

	"github.com/danilomartinssilva/bot-expenses-telegram/internal/domain"
)

type ExpenseRepository interface {
	Append(ctx context.Context, sheet string, expense domain.Expense) error
	MonthlyBalance(ctx context.Context, sheet string) (string, bool, error)
}

type OcrService interface {
	ExtractText(ctx context.Context, image []byte) (string, error)
}

type FileDownloader interface {
	Download(ctx context.Context, fileID string) ([]byte, error)
}

type ExpenseSession interface {
	Get(chatID int64) (domain.SessionData, bool)
	Set(chatID int64, data domain.SessionData)
	SetStep(chatID int64, step domain.FlowStep) bool
	SetExpenseAndStep(chatID int64, expense domain.Expense, step domain.FlowStep) bool
	Clear(chatID int64)
	Require(chatID int64) (domain.SessionData, error)
}
