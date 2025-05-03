import { WoolBallSpeechToTextService } from "./woolball.js";
import logger from "./logger.js";
import { writeFileSync } from "fs";
import { sendSucessTranscribeTask, sendErrorTranscribeTask } from "./datadog.js"

const KIBIBYTE = 1024
const MAX_FILE_SIZE = 768 * KIBIBYTE

const woolService = new WoolBallSpeechToTextService(process.env.WOOLBALL);

/**
 * @param {import('http').IncomingMessage}
 * @param {import('http').ServerResponse}
 */
function transcribe(request, response) {
  const contentType = request.headers["content-type"];
  const audioType = contentType
    .split("/").pop()
    .split(";").shift()
    .slice(0, 4); // Extract the audio type (e.g., 'mp3', 'wav')

  let audioData = Buffer.alloc(0);

  request.on("data", (chunk) => {
    audioData = Buffer.concat([audioData, chunk]);

    if (audioData.length > MAX_FILE_SIZE) {
      response.writeHead(413, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "File size exceeds the limit" }));
      return;
    }
  });

  response.setHeader("Access-Control-Allow-Origin", "https://hindsight-for.team");
  response.setHeader("Content-Type", "application/json");

  request.on("end", async () => {
    try {
      const transcriptionResult = await woolService.transcribeFromFile(audioData);
      response.writeHead(200);
      response.end(JSON.stringify(transcriptionResult));
      sendSucessTranscribeTask()
    } catch (error) {
      logger.error(`[Transcription error] ${JSON.stringify(error)}`, { transcribeService: true } );
      response.writeHead(500);
      response.end(JSON.stringify({ error: error.message }));
      sendErrorTranscribeTask()
    }
  });
}

export default transcribe
