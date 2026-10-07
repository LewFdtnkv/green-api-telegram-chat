export type ServerConfig = {
  port: number;
};

export function getServerConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(environment.PORT || 8787);
  return { port: Number.isInteger(port) && port > 0 ? port : 8787 };
}
