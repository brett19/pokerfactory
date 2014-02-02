function ConnManager()
{
  this._connected = false;
  this.socket = null;

  this.eventHandlers = {};
}

ConnManager.prototype.connect = function(uri) {
  var primus = new Primus(uri);

  var self = this;
  primus.on('open', function() {
    self._connected = true;
  });
  primus.on('close', function() {
    self._connected = false;
  });
  primus.on('data', function(data) {
    var cmd = data[0];
    var err = data.length >= 3 ? data[2] : null;
    var data = data.length >= 2 ? data[1] : null;
    self.ninvoke(cmd, err, data);
  });

  this.socket = primus;
};
ConnManager.prototype.connected = function() {
  return this._connected;
}

ConnManager.prototype.on = function(evt, handler) {
  this.socket.on(evt, handler);
};
ConnManager.prototype.off = function(evt, handler) {
  this.socket.removeListener(evt, handler);
};

ConnManager.prototype.nemit = function(cmd, data) {
  this.socket.write([cmd, data]);
};
ConnManager.prototype.ninvoke = function(cmd, err, data) {
  console.log('ninvoke', cmd, err, data);
  if (!this.eventHandlers[cmd]) {
    return;
  }

  if (!data) {
    data = {};
  }

  var handlerList = this.eventHandlers[cmd];
  for (var i = 0; i < handlerList.length; ++i) {
    handlerList[i](err, data);
  }
};
ConnManager.prototype.non = function(cmd, handler) {
  if (!this.eventHandlers[cmd]) {
    this.eventHandlers[cmd] = [];
  }
  var handlerIdx = this.eventHandlers[cmd].indexOf(handler);
  if (handlerIdx !== -1) {
    Logger.warn('attempted to reregister a net handler');
    Logger.trace();
    return;
  }
  this.eventHandlers[cmd].push(handler);
};
ConnManager.prototype.noff = function(cmd, handler) {
  if (!this.eventHandlers[cmd]) {
    return;
  }

  if (handler) {
    var handlerIdx = this.eventHandlers.indexOf(handler);
    if (handlerIdx >= 0) {
      this.eventHandlers.splice(handlerIdx, 1);
    }
  } else {
    this.eventHandlers[cmd] = [];
  }
};

connManager = new ConnManager();
