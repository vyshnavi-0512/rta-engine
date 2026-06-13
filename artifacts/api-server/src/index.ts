import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { initWss } from "./lib/ws";
import { startSimulator } from "./lib/simulator";

const port = Number(process.env.PORT ?? 3000);

const server = http.createServer(app);

initWss(server);

server.listen(port, () => {
  logger.info({ port }, "Server listening");
  startSimulator();
});