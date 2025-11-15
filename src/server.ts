import express from "express";
import http from "http";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config";
import { logger } from "./utils/logger";
import { setupWsProxy } from "./wsProxy";
import { apiLimiter } from "./middleware/rateLimiter";

const app = express();
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(
   cors({ origin: config.allowedOrigins.length ? config.allowedOrigins : true })
);
app.use(apiLimiter);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const server = http.createServer(app);
setupWsProxy(server);

server.listen(config.port, () => {
   logger.info(`Server listening on ${config.port}`);
});
