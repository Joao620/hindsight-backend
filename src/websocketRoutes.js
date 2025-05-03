"use strict";

import { WebSocketServer } from "ws";
import { createWsServer } from "tinybase/synchronizers/synchronizer-ws-server";
import { createPostgresPersister } from "tinybase/persisters/persister-postgres";
import { createMergeableStore } from "tinybase";
import logger from "./logger.js";
import { sendUserCountMetric } from "./datadog.js";

import { parse as parseURL } from "node:url";

// Client's deadline to respond to a ping, in milliseconds.
const WS_TTL = 10 * 1000;

WebSocketServer.prototype.shouldHandle = function shouldHandle(req) {
  const url = parseURL(req.url);
  if (url.pathname.startsWith("/room")) {
    return true;
  }
  return false;
};

/**
 *
 * @param {import('http').IncomingMessage} request
 * @param {import('stream').Duplex} socket
 * @param {Buffer} head
 */
export function initiateWebSocketServer(server) {
  const webSocketServer = new WebSocketServer({ server });
  wsOnConnection(webSocketServer);
  createTinySyncSynchronizer(webSocketServer)
}

/**
 *
 * @param {WebSocketServer} webSocketServer
 */
function wsOnConnection(webSocketServer) {
  /**
   * Set a timeout to terminate the client. Delay is TTL plus latency margin.
   * @param {WebSocket} client
   */
  function setClientTimeout(client) {
    return setTimeout(() => {
      client.terminate();
    }, WS_TTL + 1000);
  }

  webSocketServer.on("connection", (client, request) => {
    let clientTerminateTimeout = setClientTimeout(client);
    let lastContact = Date.now();

    client.on("pong", () => {
      const newNow = Date.now();
      logger.verbose("pongtime", newNow - lastContact - WS_TTL);
      lastContact = newNow;

      clearTimeout(clientTerminateTimeout);
      clientTerminateTimeout = setClientTimeout(client);
    });

    const ping = setInterval(() => {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    }, WS_TTL);

    client.on("close", (code, readon) => {
      clearInterval(ping);
      clearTimeout(clientTerminateTimeout);
    });
  });
}

/**
 *
 * @param {WebSocketServer} webSocketServer
 */
function createTinySyncSynchronizer(webSocketServer) {
  /** @type {Map<string, import('tinybase').Store>} */
  const pathId2Store = new Map();

  const synchronizer = createWsServer(webSocketServer, (pathId) => {
    const le_store = createMergeableStore();
    pathId2Store.set(pathId, le_store);
    logger.info("database url " + process.env.DATABASE_URL);
    if(process.env.NO_DB){
      return
    }

    return createPostgresPersister(
      le_store,
      postgres(process.env.DATABASE_URL, {
        ssl: {
          rejectUnauthorized: false,
        },
      }),
      'table-for-room-' + pathId
    )
  });

  let userCount = 0;

  synchronizer.addClientIdsListener(
    null,
    (server, pathId, clientId, addedOrRemoved) => {
      const action = addedOrRemoved == -1 ? "removed" : "added";
      const participants_count = server.getClientIds(pathId).length;

      logger.info(
        `Client ${clientId} ${action} room ${
          pathId
        }, ${participants_count} clients left`,
      );

      const maybeStore = pathId2Store.get(pathId);
      if (!maybeStore) {
        logger.error(`Store not found for ${pathId}`);
        return;
      }

      maybeStore.setValue("participants_count", participants_count);

      userCount += addedOrRemoved;
      sendUserCountMetric(userCount);
    },
  );
}
