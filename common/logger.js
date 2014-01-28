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
      node_name: 'pokerfactory',
      host: '127.0.0.1'
    })
  ]
});

function argProc(orig) {
  var out = [];
  out.push('[' + process.nodeName + ']');
  for (var i = 0; i < orig.length; ++i) {
    out.push(orig[i]);
  }
  return out;
}

function logInfo() {
  logger.info.apply(logger, argProc(arguments));
}
function logWarn(msg) {
  logger.warn.apply(logger, argProc(arguments));
}
function logError() {
  logger.error.apply(logger, argProc(arguments));
}
function logDebug() {
  logger.debug.apply(logger, argProc(arguments));
}
function logTrace() {
  logger.debug(argProc([new TraceError().stack]));
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
