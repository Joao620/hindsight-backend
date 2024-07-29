import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { createWsServer } from "tinybase/synchronizers/synchronizer-ws-server";

// Client's deadline to respond to a ping, in milliseconds.
const TTL = 10 * 1000;

/**
 * Log a message.
 * @param {...unknown} message
 */
function log(...message) {
  console.log(`${new Date().toISOString()} ${message.join(" ")}`);
}

/**
 * Set a timeout to terminate the client. Delay is TTL plus latency margin.
 * @param {WebSocket} client
 */
function setClientTimeout(client) {
  return setTimeout(() => {
    client.terminate();
  }, TTL + 1000);
}

const webServer = createServer();
const webSocketServer = new WebSocketServer({ noServer: true });
const synchronizer = createWsServer(webSocketServer);

webSocketServer.on("connection", (client, request) => {
  const url = new URL(
    request.url,
    `ws://${request.headers.host || "localhost"}`
  );
  const roomId = url.pathname.slice(1);
  const clientIds = synchronizer.getClientIds(roomId);

  let timeout = setClientTimeout(client);

  client.on("pong", () => {
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

    log("CLOSED", url, code, clientIds.length, clientIds);
  });

  log("CONNECTED", url, clientIds.length, clientIds);
});

webServer.on("request", (request, response) => {
  const url = new URL(
    request.url,
    `ws://${request.headers.host || "localhost"}`
  );

  if (url.pathname === "/") {
    // Redirect to the GitHub repository on the root path.
    response.writeHead(301, { Location: "https://github.com/haggen/tinysync" });
  } else {
    // Require upgrade on any other path.
    response.writeHead(426, { Connection: "Upgrade", Upgrade: "websocket" });
  }
  response.end();

  log(request.method, url, response.statusCode);
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
  log(`Listening on http://localhost:${port}`);
});
