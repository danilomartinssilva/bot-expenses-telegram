package sheets

import (
	"context"
	"fmt"
	"strings"

	"golang.org/x/oauth2/google"
	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"

	"github.com/danilomartinssilva/bot-expenses-telegram/internal/domain"
)

const firstExpenseRow = 4

type Repository struct {
	service     *sheets.Service
	spreadsheet string
}

func NewRepository(ctx context.Context, credentialsJSON string, spreadsheetID string) (*Repository, error) {
	creds, err := google.CredentialsFromJSON(ctx, []byte(credentialsJSON), sheets.SpreadsheetsScope)
	if err != nil {
		return nil, fmt.Errorf("sheets: load credentials: %w", err)
	}

	service, err := sheets.NewService(ctx, option.WithCredentials(creds))
	if err != nil {
		return nil, fmt.Errorf("sheets: create service: %w", err)
	}

	return &Repository{service: service, spreadsheet: spreadsheetID}, nil
}

func (r *Repository) Append(ctx context.Context, sheetName string, expense domain.Expense) error {
	exists, err := r.sheetExists(ctx, sheetName)
	if err != nil {
		return err
	}

	if !exists {
		return fmt.Errorf("a aba %s não existe na planilha", sheetName)
	}

	values := &sheets.ValueRange{
		Values: [][]interface{}{{
			expense.Date,
			string(expense.Type),
			expense.Category,
			expense.Description,
			expense.Responsible,
			expense.Value,
			expense.Essential,
			expense.PaidOrReceived,
		}},
	}

	existing, err := r.service.Spreadsheets.Values.Get(
		r.spreadsheet,
		fmt.Sprintf("'%s'!A%d:H", sheetName, firstExpenseRow),
	).ValueRenderOption("FORMATTED_VALUE").Context(ctx).Do()
	if err != nil {
		return fmt.Errorf("sheets: read existing rows: %w", err)
	}

	existingRows := existing.Values
	emptyIndex := -1
	for i, row := range existingRows {
		if isEmptyRow(row) {
			emptyIndex = i
			break
		}
	}

	var targetRow int
	if emptyIndex >= 0 {
		targetRow = firstExpenseRow + emptyIndex
	} else {
		targetRow = firstExpenseRow + len(existingRows)
	}

	_, err = r.service.Spreadsheets.Values.Update(
		r.spreadsheet,
		fmt.Sprintf("'%s'!A%d:H%d", sheetName, targetRow, targetRow),
		values,
	).ValueInputOption("USER_ENTERED").Context(ctx).Do()
	if err != nil {
		return fmt.Errorf("sheets: append expense: %w", err)
	}

	return nil
}

func (r *Repository) MonthlyBalance(ctx context.Context, sheetName string) (string, bool, error) {
	resp, err := r.service.Spreadsheets.Values.Get(
		r.spreadsheet,
		fmt.Sprintf("'%s'", sheetName),
	).ValueRenderOption("FORMATTED_VALUE").Context(ctx).Do()
	if err != nil {
		return "", false, fmt.Errorf("sheets: read sheet: %w", err)
	}

	for _, row := range resp.Values {
		for i, cell := range row {
			if strings.Contains(strings.ToLower(fmt.Sprint(cell)), "saldo") {
				if i+1 < len(row) {
					value := strings.TrimSpace(fmt.Sprint(row[i+1]))
					if value != "" {
						return value, true, nil
					}
				}
			}
		}
	}

	return "", false, nil
}

func (r *Repository) sheetExists(ctx context.Context, sheetName string) (bool, error) {
	spreadsheet, err := r.service.Spreadsheets.Get(r.spreadsheet).Context(ctx).Do()
	if err != nil {
		return false, fmt.Errorf("sheets: get spreadsheet: %w", err)
	}

	for _, s := range spreadsheet.Sheets {
		if s.Properties != nil && s.Properties.Title == sheetName {
			return true, nil
		}
	}

	return false, nil
}

func isEmptyRow(row []interface{}) bool {
	for _, cell := range row {
		if cell != nil && strings.TrimSpace(fmt.Sprint(cell)) != "" {
			return false
		}
	}
	return true
}
