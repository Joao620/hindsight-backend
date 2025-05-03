'use strict'

import logger from "./logger.js";
import myRoutes from './routes.js';
import { initiateWebSocketServer } from './websocketRoutes.js';

import { createServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import 'dotenv/config'

if (!process.env.WOOLBALL) {
  throw new Error("'WOOLBALL environment variable is missing'");
}

const server = createServer(myRoutes)
initiateWebSocketServer(server)

const port = parseInt(process.env.PORT || "5000", 10);

if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT value: ${JSON.stringify(process.env.PORT)}`);
}

server.listen(port);
