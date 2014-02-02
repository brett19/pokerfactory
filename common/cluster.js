var Cluster = require('cluster');
var os = require('os');
var Usage = require('usage');

var CLUSTER_MAP = {
  'frontend1': ['frontend', 'localhost', [7800]],
  'backend1': ['backend', 'localhost', [7700, 7701]],
  'manager': ['manager', 'localhost', [7600]]
};

function realNodeName(nodeName, nodeIdx) {
  if (nodeIdx === -1) {
    return nodeName;
  } else {
    return nodeName + '_' + nodeIdx;
  }
}

module.exports.start = function(_name, _type) {
  var nodeName = _name;
  if (!nodeName) {
    throw new Error('no node name specified');
  }

  var thisNode = CLUSTER_MAP[nodeName];
  if (!thisNode) {
    throw new Error('tried to start an invalid node name');
  }

  var nodeType = _type;
  var nodeIdx = -1;

  if (process.env.PKRF_NODE_NAME) {
    nodeType = process.env.PKRF_NODE_TYPE;
    nodeName = process.env.PKRF_NODE_NAME;
    nodeIdx = parseInt(process.env.PKRF_NODE_IDX);
  }

  if (!nodeType) {
    throw new Error('no node type could be determined');
  }

  if (thisNode[0] !== nodeType) {
    throw new Error('unexpected node type specified');
  }

  var appPath = '../' + nodeType + '/app.js';


  // If we are the only node, don't both using cluster module
  if (thisNode[2].length <= 1) {
    nodeIdx = 0;
  }

  // Restriction to prevent websocket bug
  if (nodeType === 'frontend' && thisNode[2].length > 1) {
    throw new Error('must run only 1 frontend due to websocket handshaking');
  }

  process.nodeName = realNodeName(nodeName, nodeIdx);

  // Import some stuff AFTER we've set neccessary environment
  var Logger = require('./logger');
  var pubSub = require('./pubsub')();

  Logger.info('Cluster node initializing');

  // Handle clustering requirements
  if (nodeIdx === -1 && Cluster.isMaster) {
    Logger.info('Launching slaves.');
    for (var i = 0; i < thisNode[2].length; i++) {
      Cluster.fork({
        PKRF_NODE_TYPE: nodeType,
        PKRF_NODE_NAME: nodeName,
        PKRF_NODE_IDX: i
      });
    }
    return;
  }

  // Bind / connect the services together
  var myBindPort = thisNode[2][nodeIdx];
  pubSub.bind('0.0.0.0', myBindPort);
  Logger.info('Cluster PubSub bound as ' + process.nodeName + ' (0.0.0.0:' + myBindPort + ')');

  var connectFilter = [];
  if (nodeType === 'manager') {
    connectFilter = [];
  } else if (nodeType === 'frontend') {
    connectFilter = ['manager', 'backend'];
  } else if (nodeType === 'backend') {
    connectFilter = ['manager'];
  }

  for (var i in CLUSTER_MAP) {
    if (CLUSTER_MAP.hasOwnProperty(i)) {
      var node = CLUSTER_MAP[i];
      if (connectFilter.indexOf(node[0]) === -1) {
        continue;
      }

      for (var j = 0; j < node[2].length; ++j) {
        pubSub.connect(node[1], node[2][j]);
        Logger.info('Cluster PubSub linked to ' + realNodeName(i, j) + ' (' + node[1] + ':' + node[2][j] + ')');
      }
    }
  }

  // Start a handler
  function gracefulShutdown() {
    pubSub.shutdown();
    process.exit(0);
  }
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  Logger.info('Launching service');
  require(appPath);
};
