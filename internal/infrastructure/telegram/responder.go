package telegram

import (
	"fmt"
	"time"

	tb "gopkg.in/telebot.v3"

	"github.com/danilomartinssilva/bot-expenses-telegram/internal/domain"
)

var (
	btnResponsibleDanilo = tb.InlineButton{Unique: "resp-danilo", Text: "Danilo Martins"}
	btnResponsibleBruna  = tb.InlineButton{Unique: "resp-bruna", Text: "Bruna"}

	btnTypeIn  = tb.InlineButton{Unique: "type-in", Text: "Entrada"}
	btnTypeOut = tb.InlineButton{Unique: "type-out", Text: "Saída"}

	btnValueConfirm = tb.InlineButton{Unique: "val-confirm", Text: "Confirmar valor"}
	btnValueEdit    = tb.InlineButton{Unique: "val-edit", Text: "Editar valor"}

	btnDescriptionConfirm = tb.InlineButton{Unique: "desc-confirm", Text: "Confirmar descrição"}
	btnDescriptionEdit    = tb.InlineButton{Unique: "desc-edit", Text: "Editar descrição"}

	btnExpenseSave   = tb.InlineButton{Unique: "exp-save", Text: "Salvar"}
	btnExpenseCancel = tb.InlineButton{Unique: "exp-cancel", Text: "Cancelar"}

	categoryButtons = func() []tb.InlineButton {
		buttons := make([]tb.InlineButton, len(domain.Categories))
		for i, category := range domain.Categories {
			buttons[i] = tb.InlineButton{Unique: fmt.Sprintf("cat-%d", i), Text: category}
		}
		return buttons
	}()
)

type Responder struct {
	bot *tb.Bot
}

func NewResponder(bot *tb.Bot) *Responder {
	return &Responder{bot: bot}
}

func (r *Responder) Send(chat *tb.Chat, text string, opts ...interface{}) error {
	_, err := r.bot.Send(chat, text, opts...)
	return err
}

func responsibleKeyboard() *tb.ReplyMarkup {
	return &tb.ReplyMarkup{InlineKeyboard: [][]tb.InlineButton{
		{btnResponsibleDanilo},
		{btnResponsibleBruna},
	}}
}

func typeKeyboard() *tb.ReplyMarkup {
	return &tb.ReplyMarkup{InlineKeyboard: [][]tb.InlineButton{
		{btnTypeIn, btnTypeOut},
	}}
}

func categoryKeyboard() *tb.ReplyMarkup {
	rows := make([][]tb.InlineButton, 0, (len(categoryButtons)+1)/2)
	for i := 0; i < len(categoryButtons); i += 2 {
		row := []tb.InlineButton{categoryButtons[i]}
		if i+1 < len(categoryButtons) {
			row = append(row, categoryButtons[i+1])
		}
		rows = append(rows, row)
	}
	return &tb.ReplyMarkup{InlineKeyboard: rows}
}

func valueKeyboard() *tb.ReplyMarkup {
	return &tb.ReplyMarkup{InlineKeyboard: [][]tb.InlineButton{
		{btnValueConfirm, btnValueEdit},
		{btnExpenseCancel},
	}}
}

func descriptionKeyboard() *tb.ReplyMarkup {
	return &tb.ReplyMarkup{InlineKeyboard: [][]tb.InlineButton{
		{btnDescriptionConfirm, btnDescriptionEdit},
		{btnExpenseCancel},
	}}
}

func confirmationKeyboard() *tb.ReplyMarkup {
	return &tb.ReplyMarkup{InlineKeyboard: [][]tb.InlineButton{
		{btnExpenseSave, btnExpenseCancel},
	}}
}

func (r *Responder) AskResponsible(chat *tb.Chat) error {
	return r.Send(chat, "Quem é o responsável por essa despesa?", responsibleKeyboard())
}

func (r *Responder) AskType(chat *tb.Chat, expense domain.Expense) error {
	return r.Send(chat,
		fmt.Sprintf("Responsável: %s\n\nEsse lançamento é uma entrada ou saída?", expense.Responsible),
		typeKeyboard(),
	)
}

func (r *Responder) AskCategory(chat *tb.Chat, expense domain.Expense) error {
	return r.Send(chat,
		fmt.Sprintf("Tipo: %s\n\nCategoria detectada: %s\n\nConfirme ou escolha uma categoria:", expense.Type, expense.Category),
		categoryKeyboard(),
	)
}

func (r *Responder) AskValue(chat *tb.Chat, expense domain.Expense) error {
	return r.Send(chat,
		fmt.Sprintf("Categoria: %s\n\nValor detectado: %s\n\nO valor está correto?", expense.Category, domain.FormatCurrencyBRL(expense.Value)),
		valueKeyboard(),
	)
}

func (r *Responder) AskDescription(chat *tb.Chat, expense domain.Expense) error {
	return r.Send(chat,
		fmt.Sprintf("Valor confirmado: %s\n\nDescrição detectada: %s\n\nDeseja manter essa descrição?", domain.FormatCurrencyBRL(expense.Value), expense.Description),
		descriptionKeyboard(),
	)
}

func (r *Responder) AskValueEdit(chat *tb.Chat) error {
	return r.Send(chat, "Digite o valor correto. Exemplo: 42,90")
}

func (r *Responder) AskDescriptionEdit(chat *tb.Chat) error {
	return r.Send(chat, "Digite a nova descrição.\nExemplo: Mercado Extra")
}

func (r *Responder) ShowValueUpdated(chat *tb.Chat, expense domain.Expense) error {
	return r.Send(chat,
		fmt.Sprintf("Valor atualizado: %s\n\nDescrição detectada: %s\n\nDeseja manter essa descrição?", domain.FormatCurrencyBRL(expense.Value), expense.Description),
		descriptionKeyboard(),
	)
}

func (r *Responder) ShowDescriptionUpdated(chat *tb.Chat, expense domain.Expense) error {
	return r.Send(chat,
		fmt.Sprintf("Descrição atualizada: %s\n\n%s", expense.Description, r.buildPreview(expense)),
		confirmationKeyboard(),
	)
}

func (r *Responder) ShowPreview(chat *tb.Chat, expense domain.Expense) error {
	return r.Send(chat, r.buildPreview(expense), confirmationKeyboard())
}

func (r *Responder) buildPreview(expense domain.Expense) string {
	return domain.FormatExpensePreview(expense, domain.CurrentMonthSheetName(time.Now()))
}
