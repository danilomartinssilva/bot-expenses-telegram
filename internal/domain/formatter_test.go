package domain

import "testing"

func TestFormatCurrencyBRL(t *testing.T) {
	cases := []struct {
		input float64
		want  string
	}{
		{49.90, "R$ 49,90"},
		{1234.56, "R$ 1.234,56"},
		{0.5, "R$ 0,50"},
		{1000000.99, "R$ 1.000.000,99"},
		{10, "R$ 10,00"},
	}

	for _, tc := range cases {
		got := FormatCurrencyBRL(tc.input)
		if got != tc.want {
			t.Errorf("FormatCurrencyBRL(%v) = %q, want %q", tc.input, got, tc.want)
		}
	}
}

func TestFormatBalanceMessage_NegativeParens(t *testing.T) {
	got := FormatBalanceMessage("(R$ 1.234,56)")
	want := "Saldo do mês: -R$ 1.234,56\n\nAtenção: saldo negativo."
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestFormatBalanceMessage_Plain(t *testing.T) {
	got := FormatBalanceMessage("R$ 123,45")
	want := "Saldo do mês: R$ 123,45"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestFormatExpensePreview_ContainsKeyFields(t *testing.T) {
	expense := Expense{
		Date:           "05/08/2026",
		Type:           TransactionOutgoing,
		Category:       "Alimentação",
		Description:    "Mercado Extra",
		Responsible:    "Danilo Martins",
		Value:          49.90,
		Essential:      "Não",
		PaidOrReceived: "Não",
	}

	preview := FormatExpensePreview(expense, "Agosto")

	for _, fragment := range []string{"Data: 05/08/2026", "Tipo: Saída", "Categoria: Alimentação", "Descrição: Mercado Extra", "Responsável: Danilo Martins", "Valor: R$ 49,90", "Salvar na aba Agosto?"} {
		if !contains(preview, fragment) {
			t.Errorf("preview missing %q in:\n%s", fragment, preview)
		}
	}
}

func contains(haystack, needle string) bool {
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return true
		}
	}
	return false
}
