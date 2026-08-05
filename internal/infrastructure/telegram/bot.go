package telegram

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	tb "gopkg.in/telebot.v3"

	"github.com/danilomartinssilva/bot-expenses-telegram/internal/application"
	"github.com/danilomartinssilva/bot-expenses-telegram/internal/domain"
)

type Bot struct {
	bot       *tb.Bot
	responder *Responder
	register  *application.RegisterExpense
	balance   *application.GetMonthlyBalance
	sessions  application.ExpenseSession
}

func NewBot(bot *tb.Bot, sessions application.ExpenseSession, register *application.RegisterExpense, balance *application.GetMonthlyBalance) *Bot {
	b := &Bot{
		bot:       bot,
		responder: NewResponder(bot),
		register:  register,
		balance:   balance,
		sessions:  sessions,
	}

	b.registerHandlers()

	return b
}

func (b *Bot) registerHandlers() {
	b.bot.Handle(tb.OnPhoto, b.handlePhoto)
	b.bot.Handle(tb.OnText, b.handleText)
	b.bot.Handle("/start", b.handleStart)
	b.bot.Handle("/help", b.handleHelp)
	b.bot.Handle("/saldo", b.handleSaldo)

	b.bot.Handle(&btnResponsibleDanilo, func(c tb.Context) error {
		return b.handleResponsible(c, "Danilo Martins")
	})
	b.bot.Handle(&btnResponsibleBruna, func(c tb.Context) error {
		return b.handleResponsible(c, "Bruna")
	})
	b.bot.Handle(&btnTypeIn, func(c tb.Context) error {
		return b.handleType(c, domain.TransactionIncoming)
	})
	b.bot.Handle(&btnTypeOut, func(c tb.Context) error {
		return b.handleType(c, domain.TransactionOutgoing)
	})
	b.bot.Handle(&btnValueConfirm, b.handleValueConfirm)
	b.bot.Handle(&btnValueEdit, b.handleValueEdit)
	b.bot.Handle(&btnDescriptionConfirm, b.handleDescriptionConfirm)
	b.bot.Handle(&btnDescriptionEdit, b.handleDescriptionEdit)
	b.bot.Handle(&btnExpenseSave, b.handleExpenseSave)
	b.bot.Handle(&btnExpenseCancel, b.handleExpenseCancel)

	for i := range categoryButtons {
		category := domain.Categories[i]
		b.bot.Handle(&categoryButtons[i], func(c tb.Context) error {
			return b.handleCategory(c, category)
		})
	}
}

func (b *Bot) chatID(c tb.Context) int64 {
	if sender := c.Sender(); sender != nil {
		return sender.ID
	}
	return c.Chat().ID
}

func (b *Bot) requireStep(c tb.Context, step domain.FlowStep) (domain.SessionData, bool) {
	current, ok := b.sessions.Get(b.chatID(c))
	if !ok || current.Step != step {
		return domain.SessionData{}, false
	}
	return current, true
}

func (b *Bot) handleStart(c tb.Context) error {
	return b.responder.Send(c.Chat(), strings.Join([]string{
		"Envie um print da notificação de compra para eu tentar lançar a despesa na planilha.",
		"",
		"Comandos disponíveis:",
		"/saldo - consultar saldo do mês atual",
		"/help - instruções detalhadas",
	}, "\n"))
}

func (b *Bot) handleHelp(c tb.Context) error {
	return b.responder.Send(c.Chat(), strings.Join([]string{
		"Como usar:",
		"1. Envie uma imagem/print da despesa.",
		"2. Escolha o responsável.",
		"3. Escolha se é Entrada ou Saída.",
		"4. Confirme ou altere a categoria.",
		"5. Confirme ou edite o valor.",
		"6. Confirme ou edite a descrição.",
		"7. Confirme o lançamento na planilha.",
		"",
		"Comandos:",
		"/saldo - consultar saldo do mês atual",
		"/help - estas instruções",
	}, "\n"))
}

func (b *Bot) handlePhoto(c tb.Context) error {
	chat := c.Chat()

	if err := b.responder.Send(chat, "Analisando a imagem..."); err != nil {
		return err
	}

	photo := c.Message().Photo
	if photo == nil {
		return b.responder.Send(chat, "Não consegui processar essa imagem. Tente novamente com outro print.")
	}

	err := b.register.ProcessImage(context.Background(), photo.FileID, b.chatID(c))
	if err != nil {
		var missing *application.MissingFieldsError
		if errors.As(err, &missing) {
			return b.responder.Send(chat, missing.Error())
		}

		log.Printf("process image: %v", err)
		return b.responder.Send(chat, "Não consegui processar essa imagem. Tente novamente com outro print.")
	}

	return b.responder.AskResponsible(chat)
}

func (b *Bot) handleText(c tb.Context) error {
	text := c.Text()
	if strings.HasPrefix(text, "/") {
		return nil
	}

	chat := c.Chat()
	chatID := b.chatID(c)
	current, ok := b.sessions.Get(chatID)
	if !ok {
		return nil
	}

	switch current.Step {
	case domain.StepAwaitingValueEdit:
		raw := strings.TrimSpace(strings.NewReplacer("R$", "", "r$", "").Replace(text))
		value, valid := domain.ParseEditedValue(raw)
		if !valid {
			return b.responder.Send(chat, "Valor inválido. Digite apenas o número. Exemplo: 42,90")
		}

		expense := current.Expense
		expense.Value = value
		b.sessions.SetExpenseAndStep(chatID, expense, domain.StepAwaitingDescription)

		return b.responder.ShowValueUpdated(chat, expense)

	case domain.StepAwaitingDescriptionEdit:
		description := strings.TrimSpace(text)
		if description == "" || len(description) > 200 {
			return b.responder.Send(chat, "Descrição inválida. Digite um texto de no máximo 200 caracteres.")
		}

		expense := current.Expense
		expense.Description = description
		b.sessions.SetExpenseAndStep(chatID, expense, domain.StepAwaitingFinal)

		return b.responder.ShowDescriptionUpdated(chat, expense)
	}

	return nil
}

func (b *Bot) handleResponsible(c tb.Context, responsible string) error {
	chat := c.Chat()
	current, ok := b.requireStep(c, domain.StepAwaitingResponsible)
	if !ok {
		return b.missingSession(chat)
	}

	expense := current.Expense
	expense.Responsible = responsible
	b.sessions.SetExpenseAndStep(b.chatID(c), expense, domain.StepAwaitingType)

	_ = c.Respond()
	return b.responder.AskType(chat, expense)
}

func (b *Bot) handleType(c tb.Context, transactionType domain.TransactionType) error {
	chat := c.Chat()
	current, ok := b.requireStep(c, domain.StepAwaitingType)
	if !ok {
		return b.missingSession(chat)
	}

	expense := current.Expense
	expense.Type = transactionType
	b.sessions.SetExpenseAndStep(b.chatID(c), expense, domain.StepAwaitingCategory)

	_ = c.Respond()
	return b.responder.AskCategory(chat, expense)
}

func (b *Bot) handleCategory(c tb.Context, category string) error {
	chat := c.Chat()
	current, ok := b.requireStep(c, domain.StepAwaitingCategory)
	if !ok {
		return b.missingSession(chat)
	}

	expense := current.Expense
	expense.Category = category
	b.sessions.SetExpenseAndStep(b.chatID(c), expense, domain.StepAwaitingValue)

	_ = c.Respond()
	return b.responder.AskValue(chat, expense)
}

func (b *Bot) handleValueConfirm(c tb.Context) error {
	chat := c.Chat()
	current, ok := b.requireStep(c, domain.StepAwaitingValue)
	if !ok {
		return b.missingSession(chat)
	}

	b.sessions.SetStep(b.chatID(c), domain.StepAwaitingDescription)

	_ = c.Respond()
	return b.responder.AskDescription(chat, current.Expense)
}

func (b *Bot) handleValueEdit(c tb.Context) error {
	chat := c.Chat()
	_, ok := b.requireStep(c, domain.StepAwaitingValue)
	if !ok {
		return b.missingSession(chat)
	}

	b.sessions.SetStep(b.chatID(c), domain.StepAwaitingValueEdit)

	_ = c.Respond()
	return b.responder.AskValueEdit(chat)
}

func (b *Bot) handleDescriptionConfirm(c tb.Context) error {
	chat := c.Chat()
	current, ok := b.requireStep(c, domain.StepAwaitingDescription)
	if !ok {
		return b.missingSession(chat)
	}

	b.sessions.SetStep(b.chatID(c), domain.StepAwaitingFinal)

	_ = c.Respond()
	return b.responder.ShowPreview(chat, current.Expense)
}

func (b *Bot) handleDescriptionEdit(c tb.Context) error {
	chat := c.Chat()
	_, ok := b.requireStep(c, domain.StepAwaitingDescription)
	if !ok {
		return b.missingSession(chat)
	}

	b.sessions.SetStep(b.chatID(c), domain.StepAwaitingDescriptionEdit)

	_ = c.Respond()
	return b.responder.AskDescriptionEdit(chat)
}

func (b *Bot) handleExpenseSave(c tb.Context) error {
	chat := c.Chat()

	message, err := b.register.SaveExpense(context.Background(), b.chatID(c))
	if err != nil {
		_ = c.Respond()

		if errors.Is(err, application.ErrMissingSession) {
			return b.responder.Send(chat, err.Error())
		}

		log.Printf("save expense: %v", err)
		return b.responder.Send(chat, "Não consegui salvar a despesa no Google Sheets.")
	}

	_ = c.RespondText("Despesa salva")
	return b.responder.Send(chat, message)
}

func (b *Bot) handleExpenseCancel(c tb.Context) error {
	chat := c.Chat()
	b.sessions.Clear(b.chatID(c))

	_ = c.RespondText("Cancelado")
	return b.responder.Send(chat, "Lançamento cancelado.")
}

func (b *Bot) handleSaldo(c tb.Context) error {
	message, err := b.balance.Execute(context.Background())
	if err != nil {
		log.Printf("get balance: %v", err)
		return b.responder.Send(c.Chat(), "Não consegui buscar o saldo do mês.")
	}

	return b.responder.Send(c.Chat(), message)
}

func (b *Bot) missingSession(chat *tb.Chat) error {
	return b.responder.Send(chat, "Não encontrei uma despesa pendente. Envie o print novamente.")
}

func (b *Bot) Start() {
	webhookDomain := os.Getenv("RENDER_EXTERNAL_URL")
	if webhookDomain == "" {
		webhookDomain = os.Getenv("WEBHOOK_DOMAIN")
	}

	port := 10000
	if raw := os.Getenv("PORT"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			port = parsed
		}
	}

	if webhookDomain != "" {
		b.startWebhookServer(webhookDomain, port)

		stop := make(chan os.Signal, 1)
		signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
		<-stop
		return
	}

	if err := b.bot.RemoveWebhook(true); err != nil {
		log.Printf("remove webhook: %v", err)
	}

	b.bot.Start()
	log.Println("bot started via long polling")
}

func (b *Bot) startWebhookServer(domain string, port int) {
	updates := make(chan tb.Update, 100)

	go func() {
		for update := range updates {
			b.bot.ProcessUpdate(update)
		}
	}()

	mux := http.NewServeMux()

	mux.HandleFunc("/webhook", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		var update tb.Update
		if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		updates <- update
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	server := &http.Server{Addr: ":" + strconv.Itoa(port), Handler: mux}

	go func() {
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("http server: %v", err)
		}
	}()

	go func() {
		time.Sleep(500 * time.Millisecond)

		publicURL := strings.TrimRight(domain, "/") + "/webhook"
		webhook := &tb.Webhook{Endpoint: &tb.WebhookEndpoint{PublicURL: publicURL}}
		if err := b.bot.SetWebhook(webhook); err != nil {
			log.Printf("set webhook: %v", err)
			return
		}

		log.Printf("webhook configured to %s", publicURL)
	}()

	log.Printf("server listening on port %d", port)
}
