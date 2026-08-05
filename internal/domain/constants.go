package domain

import "time"

var Categories = []string{
	"Moradia",
	"Alimentação",
	"Transporte",
	"Saúde",
	"Telefonia",
	"Cartão de Crédito",
	"Dívidas",
	"Investimentos",
	"Outros",
}

var MonthsPtBr = [...]string{
	"Janeiro",
	"Fevereiro",
	"Março",
	"Abril",
	"Maio",
	"Junho",
	"Julho",
	"Agosto",
	"Setembro",
	"Outubro",
	"Novembro",
	"Dezembro",
}

func CurrentMonthSheetName(t time.Time) string {
	return MonthsPtBr[int(t.Month())-1]
}
