const pino = require('pino');
const path = require('path');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      params: req.params,
      body: req.body,
    }),
    err: pino.stdSerializers.err,
  },
});

module.exports = logger;
