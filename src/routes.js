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

// Audio Submission Endpoint
router.post("/transcribe", async (ctx) => {
  await rateLimiter(ctx);
  if (ctx.res.writableEnded) return;

  try {
    // Validate content type
    const contentType = ctx.headers["content-type"];
    if (!contentType) {
      ctx.status = 400;
      ctx.body = { error: "Missing audio data" };
      return;
    }

    // Check if it's multipart/form-data or audio/*
    const isMultipart = contentType.startsWith("multipart/form-data");
    const isAudio = contentType.startsWith("audio/");

    if (!isMultipart && !isAudio) {
      ctx.status = 400;
      ctx.body = { error: "Invalid audio format" };
      return;
    }

    // Read audio data with size limit
    const audioFile = await readRequestBodyBuffer(ctx, 768 * 1024);

    if (!audioFile || audioFile.length === 0) {
      ctx.status = 400;
      ctx.body = { error: "Missing audio data" };
      return;
    }

    // Extract audio type
    const audioType = contentType
      .split("/").pop()
      .split(";").shift()
      .slice(0, 4);

    // Submit for transcription
    const taskId = transcribe(audioFile, audioType);

    ctx.status = 201;
    ctx.body = { taskId };

  } catch (error) {
    if (error.status === 413) {
      ctx.status = 413;
      ctx.body = { error: "Audio file exceeds maximum size limit of 768KB" };
    } else {
      logger.error("Failed to process audio submission", error);
      ctx.status = 500;
      ctx.body = { error: "Failed to process audio submission" };
    }
  }
});

// Transcription Status Polling Endpoint
router.get("/transcribe/:taskId", async (ctx) => {
  try {
    const taskId = ctx.params.taskId;

    // Validate taskId format
    if (!taskId || taskId.length !== 36 || !/^[a-zA-Z0-9\-]+$/.test(taskId)) {
      ctx.status = 400;
      ctx.body = { error: "Invalid task ID format" };
      return;
    }

    const transcriptionResult = getTranscription(taskId);

    if (!transcriptionResult) {
      ctx.status = 404;
      ctx.body = { error: "Task not found" };
      return;
    }

    ctx.status = 200;

    if (transcriptionResult.status === "processing") {
      ctx.body = {
        status: "processing",
        taskId: taskId
      };
    } else if (transcriptionResult.status === "completed") {
      ctx.body = {
        status: "completed",
        taskId: taskId,
        result: {
          data: transcriptionResult.result
        }
      };
    } else if (transcriptionResult.status === "failed") {
      ctx.body = {
        status: "failed",
        taskId: taskId,
        error: transcriptionResult.error || "Transcription failed"
      };
    } else {
      ctx.body = {
        status: "failed",
        taskId: taskId,
        error: "Unknown transcription status"
      };
    }

  } catch (error) {
    logger.error("Failed to retrieve task status", error);
    ctx.status = 500;
    ctx.body = { error: "Failed to retrieve task status" };
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