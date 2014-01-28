var Logger = require('../common/logger');
var pubSub = require('../common/pubsub')();


pubSub.subscribe('mgmt', function(event, data) {
  Logger.info('mgmt event', event, data.procName);
});

Logger.info('Started manager service.');
