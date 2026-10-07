import { randomUUID } from 'node:crypto';
import type { TelegramBot, TelegramSession, TelegramSessionStore, TelegramToken } from '../domain/types.js';

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

export function createInMemoryTelegramSessionStore(lifetimeMs = EIGHT_HOURS): TelegramSessionStore {
  const sessions = new Map<string, TelegramSession>();

  function removeExpiredSessions(now = Date.now()) {
    sessions.forEach((session, sessionId) => {
      if (session.expiresAt <= now) sessions.delete(sessionId);
    });
  }

  return {
    create(token: TelegramToken, profile: TelegramBot) {
      removeExpiredSessions();
      const session: TelegramSession = { id: randomUUID(), token, profile, expiresAt: Date.now() + lifetimeMs };
      sessions.set(session.id, session);
      return session;
    },
    find(sessionId: string) {
      removeExpiredSessions();
      return sessions.get(sessionId) || null;
    },
    delete(sessionId: string) {
      sessions.delete(sessionId);
    }
  };
}
