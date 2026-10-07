import { createTelegramService } from '../server/modules/telegram/application/telegramService.js';
import { createTelegramHttpGateway } from '../server/modules/telegram/infrastructure/telegramHttpGateway.js';
import { HttpError } from '../server/shared/errors/HttpError.js';
import { createCloudflareTelegramSessionStore, type Env } from './telegramSessionStore.js';

const SESSION_COOKIE = 'telegram_session';
const MAX_BODY_SIZE = 32 * 1024;

type RequestBody = {
  token?: unknown;
  offset?: unknown;
  chatId?: unknown;
  text?: unknown;
};

export { TelegramSessions } from './telegramSessionStore.js';

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health' && request.method === 'GET') return json({ status: 'ok' });

    const service = createTelegramService(
      createTelegramHttpGateway(),
      createCloudflareTelegramSessionStore(env.TELEGRAM_SESSIONS)
    );

    try {
      if (url.pathname === '/api/telegram/connect' && request.method === 'POST') {
        const session = await service.connect((await readBody(request)).token);
        return json(session.profile, {
          headers: { 'set-cookie': createSessionCookie(session.id, session.expiresAt) }
        });
      }

      if (url.pathname === '/api/telegram/session' && request.method === 'GET') {
        return json(await service.getProfile(getSessionId(request)));
      }

      if (url.pathname === '/api/telegram/updates' && request.method === 'POST') {
        return json(await service.getUpdates(getSessionId(request), (await readBody(request)).offset));
      }

      if (url.pathname === '/api/telegram/send' && request.method === 'POST') {
        const body = await readBody(request);
        return json(await service.sendTextMessage(getSessionId(request), body.chatId, body.text));
      }

      if (url.pathname === '/api/telegram/disconnect' && request.method === 'POST') {
        await service.disconnect(getSessionId(request));
        return new Response(null, {
          status: 204,
          headers: { 'set-cookie': clearSessionCookie() }
        });
      }

      return json({ error: 'Маршрут не найден.' }, { status: 404 });
    } catch (error) {
      return errorResponse(error);
    }
  }
} satisfies ExportedHandler<Env>;

async function readBody(request: Request): Promise<RequestBody> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_SIZE) throw new HttpError(413, 'Слишком большой запрос.');
  try {
    return await request.json() as RequestBody;
  } catch {
    throw new HttpError(400, 'Некорректное тело запроса.');
  }
}

function getSessionId(request: Request): string | undefined {
  const cookie = request.headers.get('cookie');
  return cookie
    ?.split(';')
    .map((item) => item.trim().split('='))
    .find(([name]) => name === SESSION_COOKIE)
    ?.at(1);
}

function createSessionCookie(sessionId: string, expiresAt: number): string {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${sessionId}; Max-Age=${maxAge}; Path=/api/telegram; HttpOnly; Secure; SameSite=Lax`;
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/api/telegram; HttpOnly; Secure; SameSite=Lax`;
}

function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) return json({ error: error.message }, { status: error.statusCode });
  console.error(error);
  return json({ error: 'Внутренняя ошибка сервера.' }, { status: 500 });
}

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}
