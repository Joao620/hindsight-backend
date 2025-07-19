import { WoolBallSpeechToTextService } from "./woolball.js";
import logger from "./logger.js";
import { sendErrorTranscribeTask } from "./datadog.js";

const woolService = new WoolBallSpeechToTextService(process.env.WOOLBALL);

// In-memory store for transcription tasks
/**
 * @type {Map<string, {status: string, result?: string}>}
 */
const transcriptionTasks = new Map();

/**
 * 
 * @param {import('koa').Context} ctx 
 * @param {Buffer} audioFile 
 * @param {string} audioType 
 */
function transcribe(audioData, audioType){
    const taskId = crypto.randomUUID()
    transcriptionTasks.set(taskId, { status: 'processing' });

    startTranscription(taskId, audioData, audioType);
    //startTranscriptionMocked(taskId, audioData, audioType);

    return taskId
}

function startTranscriptionMocked(taskId, audioData){
  setTimeout(() => {
    transcriptionTasks.set(taskId, { status: 'completed', result: "Mocked data" });
  }, 10000);
}

/**
 * @param {string} taskId
 * @param {Buffer} audioData
 */
async function startTranscription(taskId, audioData, audioType) {
  try {
    logger.info(`[Transcription] ${taskId} ${audioType}`, { transcribeService: true });
    const transcriptionResult = await woolService.transcribeFromFile(audioData, audioType);
    transcriptionTasks.set(taskId, { status: 'completed', result: transcriptionResult.data });
  } catch (error) {
    console.log(error)
    logger.error(`[Transcription error] ${JSON.stringify(error)}`, { transcribeService: true });
    transcriptionTasks.set(taskId, { status: 'failed', error: error.message });
    sendErrorTranscribeTask();
  }
}

/**
 * @param {string} taskId
 */
function getTranscription(taskId) {
  return transcriptionTasks.get(taskId);
}

export { transcribe, getTranscription };
