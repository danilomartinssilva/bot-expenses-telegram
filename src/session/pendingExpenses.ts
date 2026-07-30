import type { SessionData } from '../types';

const sessions = new Map<string, SessionData>();

export function getSession(userId: string | number): SessionData | undefined {
  return sessions.get(String(userId));
}

export function setSession(userId: string | number, data: SessionData): void {
  sessions.set(String(userId), data);
}

export function updateSession(userId: string | number, partial: Partial<SessionData>): void {
  const key = String(userId);
  const current = sessions.get(key);

  if (current) {
    sessions.set(key, { ...current, ...partial });
  }
}

export function clearSession(userId: string | number): void {
  sessions.delete(String(userId));
}
