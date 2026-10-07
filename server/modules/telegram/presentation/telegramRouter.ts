import { Router } from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import type { TelegramService } from '../application/telegramService.js';

type RequestBody = {
  token?: unknown;
  offset?: unknown;
  chatId?: unknown;
  text?: unknown;
};

export function createTelegramRouter(service: TelegramService) {
  const router = Router();

  router.post('/profile', asyncHandler(async (request, response) => {
    const body = request.body as RequestBody;
    response.json(await service.getProfile(body.token));
  }));

  router.post('/updates', asyncHandler(async (request, response) => {
    const body = request.body as RequestBody;
    response.json(await service.getUpdates(body.token, body.offset));
  }));

  router.post('/send', asyncHandler(async (request, response) => {
    const body = request.body as RequestBody;
    response.json(await service.sendTextMessage(body.token, body.chatId, body.text));
  }));

  return router;
}
