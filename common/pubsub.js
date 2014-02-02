var Net = require('net');
var Uuid = require('node-uuid');
var Util = require('util');
var Events = require('events');

/*
 Special Channels
 + : Add new subscription
 - : Remove a subscription
 $ : Reply to request operation
 % : Reply to request as not-accepted
 */

function PubSubLink(parent) {
  this.uuid = Uuid.v4();
  this.parent = parent;
  this.socket = null;
  this.subscriptions = [];
  this._closing = false;

  this.__handleData = this._handleData.bind(this);
}

PubSubLink.prototype.connect = function(host, port) {
  this.host = host;
  this.port = port;

  var tryConnect = function() {
    if (this._closing) {
      // Don't try to reconnect if we are purposely closing this socket.
      return;
    }

    var connectTimeout = null;
    var socket = null;
    try {
      socket = Net.createConnection(this.port, this.host, function() {
        clearTimeout(connectTimeout);
        this.socket = socket;
        this._handleConnect();
        this.parent.emit('connected', this);
      }.bind(this));
    } catch (e) {
      return tryConnect();
    }

    connectTimeout = setTimeout(function(){
      socket.destroy();
      tryConnect();
    }.bind(this), 2500);

    socket.setNoDelay(true);
    socket.on('data', this.__handleData);
    socket.on('error', function(){});
    socket.on('close', function() {
      if (this.socket !== socket) {
        return;
      }

      this.socket = null;
      tryConnect();
      this.parent.emit('disconnected', this);
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
  socket.on('error', function(){});
  socket.on('close', function() {
    this.socket = null;
    this.parent.removePeer(this);
    this.parent.emit('disconnected', this);
  }.bind(this));

  this._handleConnect();
  this.parent.emit('connected', this);
};

PubSubLink.prototype.shutdown = function() {
  this._closing = true;

  if (this.socket) {
    this.socket.end();
  }
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
    var subscriptionIdx = this.subscriptions.indexOf(event);
    if (subscriptionIdx === -1) {
      this.subscriptions.push(event);
      this.parent._newPeerSubscription(this, event);
    }
  } else if (channel === '-') {
    var subscriptionIdx = this.subscriptions.indexOf(event);
    if (subscriptionIdx !== -1) {
      this.subscriptions.splice(subscriptionIdx, 1);
    }
  } else if (channel === '$') {
    if (data.length < 2) {
      this.parent._completeOp(event, null, data[0]);
    } else {
      this.parent._completeOp(event, data[1], data[0]);
    }
  } else if (channel === '%') {
    var subscriptionIdx = this.subscriptions.indexOf(event);
    if (subscriptionIdx !== -1) {
      console.warn('attempt to transmit to unsubscribed server : ', event);
      this.subscriptions.splice(subscriptionIdx, 1);
    }
    this.parent._retransmitOp(data);
  } else {
    var replyCount = 0;
    var replyHandler = function(err, res) {
      if (replyCount > 0) {
        console.warn('tried to send more than one reply');
        console.trace();
        return;
      }
      replyCount++;

      if (!err) {
        this.write(['$', seqNo, [res]]);
      } else {
        this.write(['$', seqNo, [res, err]]);
      }
    }.bind(this);

    if (!this.parent._route(this, channel, event, data, replyHandler)) {
      this.write(['%', channel, seqNo]);
    }
  }
};





function PubSub() {
  this.loopback = { uuid: Uuid.v4() };
  this.subscriptions = {};
  this.peers = [];
  this.seqNo = 1;
  this.opHandlers = {};

  this.socket = Net.createServer(this._handleConnect.bind(this));
}
Util.inherits(PubSub, Events.EventEmitter);

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

PubSub.prototype.shutdown = function() {
  for (var i = 0; i < this.peers.length; ++i) {
    this.peers[i].shutdown();
  }
  this.peers = [];
};

PubSub.prototype.subscribe = function(channel, handler) {
  if (!this.subscriptions[channel]) {
    this.subscriptions[channel] = [];
  } else {
    var handlerIdx = this.subscriptions[channel].indexOf(handler);
    if (handlerIdx !== -1) {
      console.warn('handler tried to double-subscribe');
      return;
    }
  }

  this.subscriptions[channel].push(handler);

  if (this.subscriptions[channel].length === 1) {
    for (var i = 0; i < this.peers.length; ++i) {
      this.peers[i].subscribe(channel);
    }
  }
};

PubSub.prototype.unsubscribe = function(channel, handler) {
  if (!this.subscriptions[channel]) {
    console.warn('tried to unsubscribe a non-existant channel');
    return;
  }

  var handlerIdx = this.subscriptions[channel].indexOf(handler);
  if (handlerIdx === -1) {
    console.warn('tried to unsubscribe a unconnected handler');
    return;
  }

  this.subscriptions[channel].splice(handlerIdx, 1);

  if (this.subscriptions[channel].length === 0) {
    delete this.subscriptions[channel];
    for (var i = 0; i < this.peers.length; ++i) {
      this.peers[i].unsubscribe(channel);
    }
  }
};

PubSub.prototype._newPeerSubscription = function(peer, channel) {
  for (var seqNo in this.opHandlers) {
    if (this.opHandlers.hasOwnProperty(seqNo)) {
      var msg = this.opHandlers[seqNo];

      if (msg[2] > 0) {
        continue;
      } else if (msg[3] !== channel) {
        continue;
      }

      var channel = msg[3];
      var event = msg[4];
      var data = msg[5];
      peer.write([channel, event, data, seqNo]);
    }
  }
};

PubSub.prototype._writeAll = function(channel, event, data, seqNo, emitGlobal) {
  var totalWritten = 0;

  var dataOut = [channel, event, data];
  if (seqNo !== 0) dataOut.push(seqNo);

  var startIdx = Math.floor(Math.random() * this.peers.length);
  for (var i = 0; i < this.peers.length; ++i) {
    var peerIdx = startIdx + i;
    if (peerIdx >= this.peers.length) {
      peerIdx -= this.peers.length;
    }

    if (this.peers[peerIdx].subscriptions.indexOf(channel) === -1) {
      continue;
    }

    if (this.peers[peerIdx].write(dataOut)) {
      totalWritten++;
    }

    if (!emitGlobal && totalWritten >= 1) {
      return true;
    }
  }

  if (this.subscriptions[channel]) {
    this._route(this.loopback, channel, event, data);
    totalWritten++;
  }

  return totalWritten > 0;
};

PubSub.prototype.publish = function(channel, event, data) {
  this.request(channel, event, data, null, 0);
};

PubSub.prototype.request = function(channel, event, data, callback, timeout) {
  if (!callback) {
    this._writeAll(channel, event, data, 0, true);
  } else {
    if (!timeout) {
      timeout = 4000;
    }

    var seqNo = this.seqNo++;

    var invokeError = this._completeOp.bind(this, seqNo, true, null);
    var timer = setTimeout(invokeError, timeout);
    var message = [timer, callback, 0, channel, event, data];

    if (this._writeAll(channel, event, data, seqNo, false)) {
      message[2]++;
    }

    this.opHandlers[seqNo] = message;
  }
};

PubSub.prototype._route = function(source, channel, event, data, callback) {
  var subscription = this.subscriptions[channel];
  if (!subscription) {
    return false;
  }

  for (var i = 0; i < subscription.length; ++i) {
    subscription[i](source, event, data, callback);
  }
  return true;
};

PubSub.prototype._retransmitOp = function(seqNo) {
  var msg = this.opHandlers[seqNo];
  if (!msg) {
    return;
  }

  // Remove the previous transmission
  msg[2]--;

  // Try to send again
  var channel = msg[3];
  var event = msg[4];
  var data = msg[5];
  if (this._writeAll(channel, event, data, seqNo, false)) {
    msg[2]++;
  }
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
module.exports = function() { return pubSub; };
