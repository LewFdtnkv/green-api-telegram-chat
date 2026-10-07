import { createServer } from './app/createServer.js';
import { getServerConfig } from './config/serverConfig.js';

const config = getServerConfig();
const app = createServer();

app.listen(config.port, () => {
  console.log(`Telegram API proxy listens on http://localhost:${config.port}`);
});
