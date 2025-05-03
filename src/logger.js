import { createLogger, format, transports } from 'winston';
import 'dotenv/config'

const DD_API_KEY = process.env.DD_API_KEY
const DD_SERVICE_NAME = process.env.DD_SERVICE_NAME
const httpTransportOptions = {
  host: 'http-intake.logs.us5.datadoghq.com',
  path: `/api/v2/logs?dd-api-key=${DD_API_KEY}&ddsource=nodejs&service=${DD_SERVICE_NAME}`,
  ssl: true
};

const logger = createLogger({
  level: 'info',
  exitOnError: false,
  format: format.json(),
  transports: [
    new transports.Http(httpTransportOptions),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
  ],
});

export default logger;

//Example logs
// logger.log('error', 'Hello simple log!');
// logger.info('Hello log with metas',{color: 'blue' });
