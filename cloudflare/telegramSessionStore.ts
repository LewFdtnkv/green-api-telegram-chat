import { DurableObject } from 'cloudflare:workers';
import type { GreenApiCredentials, GreenApiInstance, TelegramSession, TelegramSessionStore } from '../server/modules/telegram/domain/types.js';

const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

export interface Env {
  TELEGRAM_SESSIONS: DurableObjectNamespace<TelegramSessions>;
}

type SessionRow = {
  id: string;
  token: string;
  profile: string;
  expiresAt: number;
};

export class TelegramSessions extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        profile TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);
    `);
  }

  async create(credentials: GreenApiCredentials, profile: GreenApiInstance): Promise<TelegramSession> {
    const expiresAt = Date.now() + SESSION_LIFETIME_MS;
    const session: TelegramSession = { id: crypto.randomUUID(), credentials, profile, expiresAt };
    this.ctx.storage.sql.exec('DELETE FROM sessions WHERE expires_at <= ?', Date.now());
    this.ctx.storage.sql.exec(
      'INSERT INTO sessions (id, token, profile, expires_at) VALUES (?, ?, ?, ?)',
      session.id,
      JSON.stringify(session.credentials),
      JSON.stringify(session.profile),
      session.expiresAt
    );
    return session;
  }

  async find(sessionId: string): Promise<TelegramSession | null> {
    this.ctx.storage.sql.exec('DELETE FROM sessions WHERE expires_at <= ?', Date.now());
    const row = this.ctx.storage.sql
      .exec<SessionRow>('SELECT id, token, profile, expires_at AS expiresAt FROM sessions WHERE id = ?', sessionId)
      .toArray()[0];
    if (!row) return null;

    try {
      return {
        id: row.id,
        credentials: JSON.parse(row.token) as GreenApiCredentials,
        profile: JSON.parse(row.profile) as GreenApiInstance,
        expiresAt: row.expiresAt
      };
    } catch {
      this.ctx.storage.sql.exec('DELETE FROM sessions WHERE id = ?', sessionId);
      return null;
    }
  }

  async delete(sessionId: string): Promise<void> {
    this.ctx.storage.sql.exec('DELETE FROM sessions WHERE id = ?', sessionId);
  }
}

export function createCloudflareTelegramSessionStore(namespace: DurableObjectNamespace<TelegramSessions>): TelegramSessionStore {
  const sessions = namespace.get(namespace.idFromName('telegram-inbox-sessions'));
  return {
    create: (credentials, profile) => sessions.create(credentials, profile),
    find: (sessionId) => sessions.find(sessionId),
    delete: (sessionId) => sessions.delete(sessionId)
  };
}
