import express from 'express';
import { createTelegramService } from '../modules/telegram/application/telegramService.js';
import { createTelegramHttpGateway } from '../modules/telegram/infrastructure/telegramHttpGateway.js';
import { createInMemoryTelegramSessionStore } from '../modules/telegram/infrastructure/inMemoryTelegramSessionStore.js';
import { createTelegramRouter } from '../modules/telegram/presentation/telegramRouter.js';
import { errorHandler } from '../shared/http/errorHandler.js';

export function createServer() {
  const app = express();
  const telegramGateway = createTelegramHttpGateway();
  const sessionStore = createInMemoryTelegramSessionStore();
  const telegramService = createTelegramService(telegramGateway, sessionStore);

  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
  app.use('/api/telegram', createTelegramRouter(telegramService));
  app.use(errorHandler);

  return app;
}
