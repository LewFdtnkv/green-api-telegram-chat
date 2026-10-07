import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import type { TelegramService } from '../application/telegramService.js';

const SESSION_COOKIE = 'telegram_session';

type RequestBody = {
  token?: unknown;
  offset?: unknown;
  chatId?: unknown;
  text?: unknown;
};

export function createTelegramRouter(service: TelegramService) {
  const router = Router();

  router.post('/connect', asyncHandler(async (request, response) => {
    const body = request.body as RequestBody;
    const session = await service.connect(body.token);
    response.cookie(SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.protocol === 'https' || request.get('x-forwarded-proto') === 'https',
      maxAge: session.expiresAt - Date.now(),
      path: '/api/telegram'
    });
    response.json(session.profile);
  }));

  router.get('/session', asyncHandler(async (request, response) => {
    response.json(await service.getProfile(getSessionId(request.headers.cookie)));
  }));

  router.post('/updates', asyncHandler(async (request, response) => {
    const body = request.body as RequestBody;
    response.json(await service.getUpdates(getSessionId(request.headers.cookie), body.offset));
  }));

  router.post('/send', asyncHandler(async (request, response) => {
    const body = request.body as RequestBody;
    response.json(await service.sendTextMessage(getSessionId(request.headers.cookie), body.chatId, body.text));
  }));

  router.post('/disconnect', asyncHandler(async (request, response) => {
    await service.disconnect(getSessionId(request.headers.cookie));
    response.clearCookie(SESSION_COOKIE, { path: '/api/telegram' });
    response.status(204).end();
  }));

  return router;
}

function getSessionId(cookieHeader: string | undefined): string | undefined {
  return cookieHeader
    ?.split(';')
    .map((item) => item.trim().split('='))
    .find(([name]) => name === SESSION_COOKIE)
    ?.at(1);
}
