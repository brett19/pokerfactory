var net = require('net');

function PubSubLink(parent) {
  this.parent = parent;
  this.socket = null;
  this.subscriptions = [];

  this.__handleData = this._handleData.bind(this);
}

PubSubLink.prototype.connect = function(host, port) {
  this.host = host;
  this.port = port;

  var tryConnect = function() {
    var socket = net.createConnection(this.port, this.host, function() {
      this.socket = socket;
      this._handleConnect();
    }.bind(this));

    socket.setNoDelay(true);
    socket.on('data', this.__handleData);
    socket.on('error', function(e) {
      this.socket = null;
    }.bind(this));
    socket.on('close', function() {
      this.socket = null;
      tryConnect();
    }.bind(this));
  }.bind(this);
  tryConnect();
};

PubSubLink.prototype.attachSocket = function(socket) {
  if (this.socket && this.socket === socket) {
    return;
  } else if (this.socket) {
    throw new Error();
  }

  if (socket === null) {
    return;
  }

  this.socket = socket;
  this.buffer = null;

  socket.setNoDelay(true);
  socket.on('data', this.__handleData);
  socket.on('error', function(e) {
    this.socket = null;
  }.bind(this));
  socket.on('close', function() {
    this.parent.removePeer(this);
    this.socket = null;
  }.bind(this));

  this._handleConnect();
};

PubSubLink.prototype.write = function(data) {
  if (!this.socket) {
    return false;
  }

  var dataStr = JSON.stringify(data);
  var dataLength = Buffer.byteLength(dataStr);
  var buffer = new Buffer(4 + dataLength);
  buffer.writeInt32BE(4 + dataLength, 0);
  buffer.write(dataStr, 4);
  this.socket.write(buffer);
  return true;
};

PubSubLink.prototype.subscribe = function(channel) {
  this.write(['+', channel]);
};

PubSubLink.prototype.unsubscribe = function(channel) {
  this.write(['-', channel]);
};

PubSubLink.prototype._handleConnect = function() {
  var subscriptions = this.parent.subscriptions;
  for(var channel in subscriptions) {
    if (!subscriptions.hasOwnProperty(channel)) {
      continue;
    }
    this.subscribe(channel);
  }
};

PubSubLink.prototype._handleData = function(data) {
  if (!this.buffer) {
    this.buffer = data;
  } else {
    this.buffer = Buffer.concat([this.buffer, data]);
  }

  while(true) {
    if (this.buffer.length < 4) {
      break;
    }

    var packetLength = this.buffer.readUInt32BE(0);
    if (this.buffer.length < packetLength) {
      break;
    }

    var dataStr = this.buffer.toString('utf8', 4, packetLength);
    var cmdInfo = JSON.parse(dataStr);

    this._route(cmdInfo[0], cmdInfo[1], cmdInfo[2], cmdInfo[3]);

    this.buffer = this.buffer.slice(packetLength);
  }
};

PubSubLink.prototype._route = function(channel, event, data, seqNo) {
  if (channel === '+') {
    this.subscriptions.push(event);
    this.parent._newPeerSubscription(this, channel);
  } else if (channel === '-') {
    var subscriptionIdx = this.subscriptions.indexOf(event);
    if (subscriptionIdx !== -1) {
      this.subscriptions.splice(subscriptionIdx, 1);
    }
  } else if (channel === '$') {
    this.parent._completeOp(event, false, data);
  } else {
    this.parent._route(channel, event, data, function(replydata) {
      this.write(['$', seqNo, replydata]);
    }.bind(this));
  }
};





function PubSub() {
  this.subscriptions = {};
  this.peers = [];
  this.seqNo = 0;
  this.opHandlers = {};

  this.socket = net.createServer(this._handleConnect.bind(this));
}

PubSub.prototype._handleConnect = function(client) {
  var server = new PubSubLink(this);
  server.attachSocket(client);
  this.peers.push(server);
};

PubSub.prototype.bind = function(host, port) {
  this.socket.listen(port, host);
};

PubSub.prototype.connect = function(host, port) {
  var server = new PubSubLink(this);
  server.connect(host, port);
  this.peers.push(server);
};

PubSub.prototype.removePeer = function(peer) {
  var peerIdx = this.peers.indexOf(peer);
  if (peerIdx !== -1) {
    this.peers.splice(peerIdx, 1);
  }
};

PubSub.prototype.subscribe = function(channel, callback) {
  if (this.subscriptions[channel]) {
    // Already subscribed
    return;
  }

  this.subscriptions[channel] = callback;
  for (var i = 0; i < this.peers.length; ++i) {
    this.peers[i].subscribe(channel);
  }
};

PubSub.prototype.unsubscribe = function(channel) {
  if (!this.subscriptions[channel]) {
    // Not subscribed
    return;
  }

  this.subscriptions[channel] = null;
  for (var i = 0; i < this.peers.length; ++i) {
    this.peers[i].unsubscribe(channel);
  }
};

PubSub.prototype.publish = function(channel, event, data) {
  this.request(channel, event, data, 0, null);
};

PubSub.prototype._newPeerSubscription = function(peer, channel) {
  for (var seqNo in this.opHandlers) {
    if (this.opHandlers.hasOwnProperty(seqNo)) {
      var opHandler = this.opHandlers[seqNo];

      if (opHandler.length < 5) {
        continue;
      }

      var timer = opHandler[0];
      var callback = opHandler[1];
      var channel = opHandler[2];
      var event = opHandler[3];
      var data = opHandler[4];
      this.opHandlers[seqNo] = [timer, callback];

      if (opHandler[2] !== channel) {
        continue;
      }

      peer.write([channel, event, data, seqNo]);
    }
  }
}

PubSub.prototype._writeAll = function(channel, data) {
  var totalWritten = 0;
  for (var i = 0; i < this.peers.length; ++i) {
    if (this.peers[i].subscriptions.indexOf(channel) === -1) {
      continue;
    }

    if (this.peers[i].write(data)) {
      totalWritten++;
    }
  }
  return totalWritten;
};

PubSub.prototype.request = function(channel, event, data, callback, timeout) {
  if (!timeout) {
    this._writeAll([channel, event, data]);
  } else {
    var seqNo = this.seqNo++;

    var invokeError = this._completeOp.bind(this, seqNo, true, null);
    var timer = setTimeout(invokeError, timeout);

    if (this._writeAll(channel, [channel, event, data, seqNo]) > 0) {
      this.opHandlers[seqNo] = [timer, callback];
    } else {
      this.opHandlers[seqNo] = [timer, callback, channel, event, data];
    }
  }
};

PubSub.prototype._route = function(channel, event, data, callback) {
  var subscription = this.subscriptions[channel];
  if (!subscription) {
    return false;
  }

  subscription(event, data, callback);
  return true;
};

PubSub.prototype._completeOp = function(seqNo, err, data) {
  if (!this.opHandlers[seqNo]) {
    return;
  }

  var handler = this.opHandlers[seqNo];
  delete this.opHandlers[seqNo];

  clearTimeout(handler[0]);
  if (handler[1]) {
    handler[1](err, data);
  }
};

var pubSub = new PubSub();
module.exports = function() { return pubSub; }
