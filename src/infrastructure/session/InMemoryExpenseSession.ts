import type { ExpenseSession, SessionData } from '../../application/ports/ExpenseSession';

export class InMemoryExpenseSession implements ExpenseSession {
  private readonly sessions = new Map<string, SessionData>();

  get(userId: string | number): SessionData | undefined {
    return this.sessions.get(String(userId));
  }

  require(userId: string | number): SessionData {
    const session = this.sessions.get(String(userId));

    if (!session) {
      throw new Error('Não encontrei uma despesa pendente. Envie o print novamente.');
    }

    return session;
  }

  set(userId: string | number, data: SessionData): void {
    this.sessions.set(String(userId), data);
  }

  update(userId: string | number, partial: Partial<SessionData>): void {
    const key = String(userId);
    const current = this.sessions.get(key);

    if (current) {
      this.sessions.set(key, { ...current, ...partial });
    }
  }

  clear(userId: string | number): void {
    this.sessions.delete(String(userId));
  }
}
