import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  exitOnError: false,
  format: format.json(),
  transports: [
    new transports.File({ filename: 'le_logs.log' }),
  ],
});

export default logger;

// Example logs
logger.log('info', 'Hello simple log!');
logger.info('Hello log with metas',{color: 'blue' });