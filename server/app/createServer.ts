import cors from 'cors';
import express from 'express';
import { createTelegramService } from '../modules/telegram/application/telegramService.js';
import { createTelegramHttpGateway } from '../modules/telegram/infrastructure/telegramHttpGateway.js';
import { createTelegramRouter } from '../modules/telegram/presentation/telegramRouter.js';
import { errorHandler } from '../shared/http/errorHandler.js';

export function createServer() {
  const app = express();
  const telegramGateway = createTelegramHttpGateway();
  const telegramService = createTelegramService(telegramGateway);

  app.use(cors());
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/telegram', createTelegramRouter(telegramService));
  app.use(errorHandler);

  return app;
}
