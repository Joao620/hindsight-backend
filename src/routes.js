'use strict';

import transcribe from "./transcribeService.js";
import url from "node:url";
import logger from "./logger.js";
import flameLimit from 'flame-limit';
import strategies from "flame-limit/strategies";

const limiter = flameLimit({
  limit: 6,
  windowMs: 30 * 1000,
  trustProxy: false,
  strategy: 'token',

  onLimit: (req, res, next, resetTime) => {
    res.writeHead(429);
    res.end()
  }
});

/**
 *
 * @param {import('http').IncomingMessage}
 * @param {import('http').ServerResponse}
 */
const routes = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  res.writeHead(200, { "Access-Control-Allow-Origin": "https://hindsight-for.team" });

  if (req.method === "GET" && parsedUrl.pathname === "/wake-up") {
    limiter(req, res, (err) => {
      if (err) {
        return;
      }
      res.end();
    });
  } else if (req.method === "POST" && parsedUrl.pathname === "/transcribe") {
    limiter(req, res, (err) => {
      if (err) {
        return;
      }
      transcribe(req, res);
    });
  } else if (req.method === "POST" && parsedUrl.pathname === "/error") {
    let rawData = "";
    req.on("data", (chunk) => {
      rawData += chunk;
    });
    req.on("end", () => {
      try {
        const jsonReq = JSON.parse(rawData);
        logger.error(
          `[client-frontend] on [${jsonReq.place}] with the message: ${jsonReq.msg}`,
          { where: "client-frontend" },
        );
      } catch (error) {
        logger.error("Invalid JSON received", error);
      }
    });
  } else if (parsedUrl.pathname.startsWith("/room/")) {
    res.writeHead(426, { Connection: "Upgrade", Upgrade: "websocket" });
    res.end();
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
};

export default routes;
