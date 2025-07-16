import Koa from "koa";
import { transcribe, getTranscription } from "./transcribeService.js";
import rateLimiter from "./limiter.js";
import logger from "./logger.js";
import MySimpleRouter from "./mySimpleRouter.js";
import readRequestBodyBuffer from "./readRequestBodyBuffer.js";

const router = new MySimpleRouter();

// Wake-up
router.get("/wake-up", async (ctx) => {
  await rateLimiter(ctx);
  ctx.status = 200;
  ctx.body = "OK";
});

// Transcribe POST
router.post("/transcribe", async (ctx) => {
  await rateLimiter(ctx);
  if (ctx.res.writableEnded) return

  const audioFile = await readRequestBodyBuffer(ctx, 768 * 1024)

  const contentType = ctx.headers["content-type"];
  const audioType = contentType
    .split("/").pop()
    .split(";").shift()
    .slice(0, 4); // Extract the audio type (e.g., 'mp3', 'wav')

  const taskId = transcribe(audioFile, audioType);

  ctx.body = taskId;
  ctx.status = 200;
});

// Transcribe GET with param
router.get("/transcribe/:id", async (ctx) => {
  const taskId = ctx.params.id;
  if (!taskId || taskId.length !== 36 || !/^[a-zA-Z0-9\-]+$/.test(taskId)) {
    ctx.status = 400;
    ctx.body = { error: "taskId must be alphanumeric" };
    return;
  }
  const transcriptionResult = getTranscription(taskId);
  if (!transcriptionResult) {
    ctx.status = 404;
  } else if (transcriptionResult.status === "processing") {
    ctx.status = 202;
    ctx.body = "Transcription in progress";
  } else if (transcriptionResult.status === "completed") {
    ctx.status = 200;
    ctx.body = transcriptionResult.result;
  } else if (transcriptionResult.status === "failed") {
    ctx.status = 500;
    ctx.body = transcriptionResult.result;
  } else {
    ctx.status = 500;
    ctx.body = "Transcription failed";
  }
});

// Error log route
router.post("/error", async (ctx) => {
  try {
    const { place, msg } = ctx.request.body;
    logger.error(`[client-frontend] on [${place}] with the message: ${msg}`, { where: "client-frontend" });
    ctx.status = 200;
    ctx.body = "Logged";
  } catch (error) {
    logger.error("Invalid JSON received", error);
    ctx.status = 400;
    ctx.body = "Invalid JSON";
  }
});

// Room route
router.get("/room/:id", async (ctx) => {
  ctx.status = 426;
  ctx.set("Connection", "Upgrade");
  ctx.set("Upgrade", "websocket");
  ctx.body = "";
});

export default router;