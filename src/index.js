import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { createWsServer } from "tinybase/synchronizers/synchronizer-ws-server";
import { createMergeableStore } from "tinybase";
import { createPostgresPersister } from 'tinybase/persisters/persister-postgres';
import postgres from "postgres";
import logger from "./logger.js";

// Client's deadline to respond to a ping, in milliseconds.
const TTL = 15 * 1000;


/**
 * Set a timeout to terminate the client. Delay is TTL plus latency margin.
 * @param {WebSocket} client
 */
function setClientTimeout(client) {
  return setTimeout(() => {
    client.terminate();
  }, TTL + 1000);
}

//postgres://hindsight:banana123@localhost:5432/hindsight-db
logger.info('database url ' + process.env.DATABASE_URL);

// const sql = postgres("postgres://u2dfm420h05jmi:pe4c6a587a3789f19d51e30ab1e0ed83a43d6e25255cdc72e80c394dadbebd0bb@c11ai4tgvdcf54.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d2n790m55vomne",
//   {
//     ssl: {
//       rejectUnauthorized: false,
//     },
//   }
// )
// sql`SELECT * FROM "tableforroom-cvgvzhhjq3"`
//   .then((result) => console.log(result))
//   .catch((err) => console.log("Database connection failed", err));

const webServer = createServer();
const webSocketServer = new WebSocketServer({ noServer: true });
const synchronizer = createWsServer(webSocketServer, 
  (pathId) =>
    createPostgresPersister(
      createMergeableStore(),
      postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } }),
      'tableforroom-' + pathId
    )
);

// (pathId) =>
//   createSqlite3Persister(
//     createMergeableStore(),
//     new sqlite3.Database(pathId + ".sqlite3"),
//   )


webSocketServer.on("connection", (client, request) => {
  const url = new URL(
    request.url,
    `ws://${request.headers.host || "localhost"}`
  );
  const roomId = url.pathname.slice(1);
  const clientIds = synchronizer.getClientIds(roomId);

  let timeout = setClientTimeout(client);
  let lastContact = Date.now();

  client.on("pong", () => {
    const newNow = Date.now();
    logger.verbose('pongtime', newNow - lastContact - TTL);
    lastContact = newNow;
    clearTimeout(timeout);
    timeout = setClientTimeout(client);
  });

  const ping = setInterval(() => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping();
    }
  }, TTL);

  client.on("close", (code, readon) => {
    const clientIds = synchronizer.getClientIds(roomId);

    clearInterval(ping);
    clearTimeout(timeout);

    logger.info("CLOSED", url, code, clientIds.length, clientIds);
  });

  logger.info("CONNECTED", url, clientIds.length, clientIds);
});

webServer.on("request", (request, response) => {
  const url = new URL(
    request.url,
    `ws://${request.headers.host || "localhost"}`
  );

  if (url.pathname === "/") {
    // Redirect to the GitHub repository on the root path.
    response.writeHead(301, { Location: "https://github.com/haggen/tinysync" });
  } else if (url.pathname === "/wake-up") {
    // just to wakeup the server
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.writeHead(200);
  } else {
    // Require upgrade on any other path.
    response.writeHead(426, { Connection: "Upgrade", Upgrade: "websocket" });
  }
  response.end();

  logger.info(request.method, url, response.statusCode);
});

webServer.on("upgrade", (request, socket, head) => {
  // Channel is derived from request's path and it can't be empty.
  if (request.url === "/") {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }

  webSocketServer.handleUpgrade(request, socket, head, (client) => {
    webSocketServer.emit("connection", client, request);
  });
});

const port = parseInt(process.env.PORT || "5000", 10);

if (Number.isNaN(port)) {
  throw new Error(`Invalid PORT value: ${JSON.stringify(process.env.PORT)}`);
}

webServer.listen(port, () => {
  logger.info(`Listening on http://localhost:${port}`);
});
