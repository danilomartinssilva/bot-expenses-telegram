package application

import (
	"context"
	"fmt"
	"time"

	"github.com/danilomartinssilva/bot-expenses-telegram/internal/domain"
)

type GetMonthlyBalance struct {
	Repo ExpenseRepository
}

func (g *GetMonthlyBalance) Execute(ctx context.Context) (string, error) {
	sheetName := domain.CurrentMonthSheetName(time.Now())

	balance, ok, err := g.Repo.MonthlyBalance(ctx, sheetName)
	if err != nil {
		return "", err
	}

	if !ok {
		return fmt.Sprintf("Não consegui localizar o saldo na aba %s.", sheetName), nil
	}

	return domain.FormatBalanceMessage(balance), nil
}
