package application

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/danilomartinssilva/bot-expenses-telegram/internal/domain"
)

type RegisterExpense struct {
	Ocr        OcrService
	Downloader FileDownloader
	Repo       ExpenseRepository
	Session    ExpenseSession
}

func (r *RegisterExpense) ProcessImage(ctx context.Context, fileID string, chatID int64) error {
	image, err := r.Downloader.Download(ctx, fileID)
	if err != nil {
		return err
	}

	text, err := r.Ocr.ExtractText(ctx, image)
	if err != nil {
		return err
	}

	expense := domain.ParseExpenseFromText(text)

	if len(expense.MissingFields) > 0 {
		return &MissingFieldsError{Missing: expense.MissingFields, OcrText: text}
	}

	r.Session.Set(chatID, domain.SessionData{Expense: expense, Step: domain.StepAwaitingResponsible})
	return nil
}

func (r *RegisterExpense) SaveExpense(ctx context.Context, chatID int64) (string, error) {
	current, err := r.Session.Require(chatID)
	if err != nil {
		return "", err
	}

	if current.Step != domain.StepAwaitingFinal {
		return "", errors.New("Não encontrei uma despesa pendente. Envie o print novamente.")
	}

	sheetName := domain.CurrentMonthSheetName(time.Now())

	if err := r.Repo.Append(ctx, sheetName, current.Expense); err != nil {
		return "", err
	}

	r.Session.Clear(chatID)

	balance, ok, err := r.Repo.MonthlyBalance(ctx, sheetName)
	if err != nil {
		return "", err
	}

	message := fmt.Sprintf("Despesa salva na aba %s.", sheetName)

	if ok {
		message += "\n\n" + domain.FormatBalanceMessage(balance)
	}

	return message, nil
}
