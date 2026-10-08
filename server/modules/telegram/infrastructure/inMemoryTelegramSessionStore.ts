import { randomUUID } from 'node:crypto';
import type { GreenApiCredentials, GreenApiInstance, TelegramSession, TelegramSessionStore } from '../domain/types.js';

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

export function createInMemoryTelegramSessionStore(lifetimeMs = EIGHT_HOURS): TelegramSessionStore {
  const sessions = new Map<string, TelegramSession>();

  function removeExpiredSessions(now = Date.now()) {
    sessions.forEach((session, sessionId) => {
      if (session.expiresAt <= now) sessions.delete(sessionId);
    });
  }

  return {
    async create(credentials: GreenApiCredentials, profile: GreenApiInstance) {
      removeExpiredSessions();
      const session: TelegramSession = { id: randomUUID(), credentials, profile, expiresAt: Date.now() + lifetimeMs };
      sessions.set(session.id, session);
      return session;
    },
    async find(sessionId: string) {
      removeExpiredSessions();
      return sessions.get(sessionId) || null;
    },
    async delete(sessionId: string) {
      sessions.delete(sessionId);
    }
  };
}
