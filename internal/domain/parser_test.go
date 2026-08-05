package domain

import "testing"

func TestParseExpenseFromText_FullOCR(t *testing.T) {
	text := "Compra aprovada\nNubank\nhoje 05/08/2026\nR$ 49,90\nMercado Extra"

	expense := ParseExpenseFromText(text)

	if len(expense.MissingFields) != 0 {
		t.Fatalf("expected no missing fields, got %v", expense.MissingFields)
	}

	if expense.Date != "05/08/2026" {
		t.Errorf("expected date 05/08/2026, got %q", expense.Date)
	}

	if expense.Value != 49.90 {
		t.Errorf("expected value 49.90, got %v", expense.Value)
	}

	if expense.Description != "Nubank" {
		t.Errorf("expected description 'Nubank', got %q", expense.Description)
	}

	if expense.Type != TransactionOutgoing {
		t.Errorf("expected default type Saída, got %q", expense.Type)
	}
}

func TestParseExpenseFromText_MissingDate(t *testing.T) {
	text := "Compra aprovada\nR$ 12,34\nIfood"

	expense := ParseExpenseFromText(text)

	if len(expense.MissingFields) != 1 || expense.MissingFields[0] != "data" {
		t.Fatalf("expected missing 'data', got %v", expense.MissingFields)
	}

	if expense.Value != 12.34 {
		t.Errorf("expected value 12.34, got %v", expense.Value)
	}

	if expense.Category != "Alimentação" {
		t.Errorf("expected category Alimentação, got %q", expense.Category)
	}
}

func TestParseExpenseFromText_MissingValue(t *testing.T) {
	text := "Compra aprovada\n10/08/2026"

	expense := ParseExpenseFromText(text)

	if len(expense.MissingFields) != 1 || expense.MissingFields[0] != "valor" {
		t.Fatalf("expected missing 'valor', got %v", expense.MissingFields)
	}

	if expense.Date != "10/08/2026" {
		t.Errorf("expected date 10/08/2026, got %q", expense.Date)
	}
}

func TestParseDate_VariousFormats(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"05/08/2026", "05/08/2026"},
		{"5/8", "05/08/2026"},
		{"05-08", "05/08/2026"},
		{"10.08.26", "10/08/2026"},
		{"sem data aqui", ""},
	}

	for _, tc := range cases {
		got, ok := parseDate(tc.input)
		if !ok {
			if tc.want != "" {
				t.Errorf("parseDate(%q) expected %q, got none", tc.input, tc.want)
			}
			continue
		}
		if got != tc.want {
			t.Errorf("parseDate(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}

func TestParseValue_PicksLargest(t *testing.T) {
	text := "Saldo anterior R$ 1.234,56\nCompra aprovada R$ 49,90"

	value, ok := parseValue(text)
	if !ok {
		t.Fatal("expected value to be parsed")
	}

	if value != 1234.56 {
		t.Errorf("expected 1234.56, got %v", value)
	}
}

func TestParseEditedValue(t *testing.T) {
	cases := []struct {
		input string
		want  float64
		ok    bool
	}{
		{"42,90", 42.90, true},
		{"R$ 42,90", 42.90, true},
		{"1234,56", 1234.56, true},
		{"42.90", 42.90, true},
		{"abc", 0, false},
		{"0", 0, false},
		{"-5,00", 0, false},
	}

	for _, tc := range cases {
		got, ok := ParseEditedValue(tc.input)
		if ok != tc.ok {
			t.Errorf("ParseEditedValue(%q) ok = %v, want %v", tc.input, ok, tc.ok)
			continue
		}
		if ok && got != tc.want {
			t.Errorf("ParseEditedValue(%q) = %v, want %v", tc.input, got, tc.want)
		}
	}
}

func TestDetectCategory(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"Nubank cartão de crédito fatura", "Cartão de Crédito"},
		{"Uber", "Transporte"},
		{"Farmacia Drogasil", "Saúde"},
		{"conta de telefone claro", "Telefonia"},
		{"aluguel apartamento", "Moradia"},
		{"compra genérica", "Outros"},
	}

	for _, tc := range cases {
		got := DetectCategory(tc.input)
		if got != tc.want {
			t.Errorf("DetectCategory(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}
