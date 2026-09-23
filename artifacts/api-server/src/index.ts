import http from "http";
import app from "./app";
import { env } from "./env";
import { logger } from "./lib/logger";
import { initWss } from "./lib/ws";
import { startSimulator } from "./lib/simulator";

const server = http.createServer(app);

initWss(server);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "Server listening");
  startSimulator();
});