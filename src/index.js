'use strict'

import 'dotenv/config'
import logger from "./logger.js";
import myRoutes from './routes.js';
import { initiateWebSocketServer } from './websocketRoutes.js';

import { WebSocket, WebSocketServer } from "ws";

import Koa from 'koa'
import http from 'node:http';

if (!process.env.WOOLBALL) {
  throw new Error("'WOOLBALL environment variable is missing'");
}

const app = new Koa()

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    logger.error(err);
    ctx.status = err.status || 500;
    ctx.body = err.message;
    ctx.app.emit('error', err, ctx);
  }
});

// CORS
app.use(async (ctx, next) => {
  //ctx.set("Access-Control-Allow-Origin", "https://hindsight-for.team");
  ctx.set("Access-Control-Allow-Origin", "*");
  ctx.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  ctx.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (ctx.method === "OPTIONS") {
    ctx.status = 204;
  } else {
    await next();
  }
});

app.use(myRoutes.routesMiddleware());

// 404 fallback
app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = "Not Found";
});

const server = http.createServer(app.callback())
initiateWebSocketServer(server)

const port = parseInt(process.env.PORT || "5000", 10);
server.listen(port);

export default app;
