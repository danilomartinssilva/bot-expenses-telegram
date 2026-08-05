package domain

import (
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

var genericLines = []string{
	"compra",
	"aprovada",
	"cartao",
	"cartão",
	"credito",
	"crédito",
	"debito",
	"débito",
	"notificacao",
	"notificação",
	"r$",
}

var categoryKeywords = map[string][]string{
	"Moradia":           {"aluguel", "condominio", "condomínio", "financiamento", "imovel", "imóvel", "casa"},
	"Alimentação":       {"ifood", "restaurante", "mercado", "padaria", "lanchonete", "burger", "pizza", "supermercado"},
	"Transporte":        {"uber", "99", "posto", "combustivel", "combustível", "gasolina", "estacionamento", "metro", "metrô"},
	"Saúde":             {"farmacia", "farmácia", "drogaria", "hospital", "clinica", "clínica", "medico", "médico"},
	"Telefonia":         {"claro", "vivo", "tim", "oi", "telefone", "internet", "fibra"},
	"Cartão de Crédito": {"cartao", "cartão", "fatura", "credito", "crédito", "nubank", "itaucard"},
	"Dívidas":           {"emprestimo", "empréstimo", "parcela", "limite", "financiamento"},
	"Investimentos":     {"investimento", "tesouro", "cdb", "renda fixa", "acoes", "ações"},
}

var (
	dateRe    = regexp.MustCompile(`\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b`)
	valueRe   = regexp.MustCompile(`(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})\b`)
	dateOnly  = regexp.MustCompile(`\d{1,2}[/.-]\d{1,2}`)
	valueOnly = regexp.MustCompile(`(?:R\$\s*)?\d+[,.]\d{2}`)
)

func DetectCategory(text string) string {
	normalized := strings.ToLower(text)

	for _, category := range Categories {
		for _, keyword := range categoryKeywords[category] {
			if strings.Contains(normalized, keyword) {
				return category
			}
		}
	}

	return "Outros"
}

func parseDate(text string) (string, bool) {
	match := dateRe.FindStringSubmatch(text)
	if match == nil {
		return "", false
	}

	day := match[1]
	if len(day) == 1 {
		day = "0" + day
	}
	month := match[2]
	if len(month) == 1 {
		month = "0" + month
	}
	year := match[3]
	if year == "" {
		year = strconv.Itoa(time.Now().Year())
	} else if len(year) == 2 {
		year = "20" + year
	}

	return day + "/" + month + "/" + year, true
}

func parseValue(text string) (float64, bool) {
	matches := valueRe.FindAllStringSubmatch(text, -1)
	if len(matches) == 0 {
		return 0, false
	}

	var values []float64

	for _, match := range matches {
		raw := match[1]
		normalized := raw
		if strings.Contains(raw, ",") {
			normalized = strings.ReplaceAll(raw, ".", "")
			normalized = strings.Replace(normalized, ",", ".", 1)
		}
		if value, err := strconv.ParseFloat(normalized, 64); err == nil {
			values = append(values, value)
		}
	}

	if len(values) == 0 {
		return 0, false
	}

	sort.Sort(sort.Reverse(sort.Float64Slice(values)))
	return values[0], true
}

func parseDescription(text string) string {
	var cleaned []string

	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if dateOnly.MatchString(line) {
			continue
		}
		if valueOnly.MatchString(line) {
			continue
		}
		cleaned = append(cleaned, line)
	}

	for _, line := range cleaned {
		lower := strings.ToLower(line)
		generic := false

		for _, word := range genericLines {
			if strings.Contains(lower, word) {
				generic = true
				break
			}
		}

		if !generic {
			return line
		}
	}

	if len(cleaned) > 0 {
		return cleaned[0]
	}

	return "Despesa via OCR"
}

func ParseExpenseFromText(ocrText string) Expense {
	date, hasDate := parseDate(ocrText)
	value, hasValue := parseValue(ocrText)
	description := parseDescription(ocrText)
	category := DetectCategory(description + "\n" + ocrText)

	var missingFields []string

	if !hasDate {
		missingFields = append(missingFields, "data")
	}
	if !hasValue {
		missingFields = append(missingFields, "valor")
	}

	return Expense{
		Date:           date,
		Type:           TransactionOutgoing,
		Category:       category,
		Description:    description,
		Value:          value,
		Essential:      "Não",
		PaidOrReceived: "Não",
		OcrText:        ocrText,
		MissingFields:  missingFields,
	}
}

func ParseEditedValue(text string) (float64, bool) {
	clean := strings.TrimSpace(strings.NewReplacer("R$", "", "r$", "").Replace(text))
	clean = strings.ReplaceAll(clean, " ", "")

	if strings.Contains(clean, ",") {
		clean = strings.ReplaceAll(clean, ".", "")
		clean = strings.Replace(clean, ",", ".", 1)
	}

	if value, err := strconv.ParseFloat(clean, 64); err == nil && value > 0 {
		return value, true
	}

	alt := strings.Replace(text, ",", ".", 1)
	alt = strings.TrimSpace(alt)

	if value, err := strconv.ParseFloat(alt, 64); err == nil && value > 0 {
		return value, true
	}

	return 0, false
}
