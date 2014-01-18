var util = require('util');
var winston = require('winston');
require('winston-logio');

var logger = new winston.Logger({
  transports: [
    new (winston.transports.Console)({
      level: 'debug',
      prettyPrint: true,
      colorize: true
    }),
    new (winston.transports.Logio)({
      level: 'debug',
      port: 28777,
      node_name: 'stagpoker',
      host: '127.0.0.1'
    })
  ]
});

function logInfo() {
  logger.info.apply(logger, arguments);
}
function logWarn(msg) {
  logger.warn.apply(logger, arguments);
}
function logError() {
  logger.error.apply(logger, arguments);
}
function logDebug() {
  logger.debug.apply(logger, arguments);
}
function logTrace() {
  logger.debug(new TraceError().stack);
}

function TraceError() {
  Error.call(this);
  Error.captureStackTrace(this, logTrace);
  this.name = 'stack trace';
}
util.inherits(TraceError, Error);

module.exports = {
  info: logInfo,
  warn: logWarn,
  error: logError,
  debug: logDebug,
  trace: logTrace
};
