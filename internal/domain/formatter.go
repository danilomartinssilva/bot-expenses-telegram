package domain

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

func FormatCurrencyBRL(value float64) string {
	negative := value < 0
	v := math.Abs(value)

	intPart := int64(v)
	decPart := int64(math.Round((v - float64(intPart)) * 100))

	if decPart == 100 {
		intPart++
		decPart = 0
	}

	intStr := strconv.FormatInt(intPart, 10)

	var builder []byte
	for i, c := range []byte(intStr) {
		if i > 0 && (len(intStr)-i)%3 == 0 {
			builder = append(builder, '.')
		}
		builder = append(builder, c)
	}

	result := fmt.Sprintf("%s,%02d", string(builder), decPart)

	if negative {
		return "-R$ " + result
	}
	return "R$ " + result
}

func FormatExpensePreview(expense Expense, monthSheetName string) string {
	return strings.Join([]string{
		"Despesa identificada:",
		"",
		"Data: " + expense.Date,
		"Tipo: " + string(expense.Type),
		"Categoria: " + expense.Category,
		"Descrição: " + expense.Description,
		"Responsável: " + expense.Responsible,
		"Valor: " + FormatCurrencyBRL(expense.Value),
		"Essencial?: " + expense.Essential,
		"Pago/Recebido?: " + expense.PaidOrReceived,
		"",
		"Salvar na aba " + monthSheetName + "?",
	}, "\n")
}

func FormatBalanceMessage(balance string) string {
	trimmed := strings.TrimSpace(balance)

	if strings.HasPrefix(trimmed, "(") && strings.HasSuffix(trimmed, ")") {
		clean := strings.ReplaceAll(strings.ReplaceAll(trimmed, "(", ""), ")", "")
		return fmt.Sprintf("Saldo do mês: -%s\n\nAtenção: saldo negativo.", clean)
	}

	return fmt.Sprintf("Saldo do mês: %s", trimmed)
}
