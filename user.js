var Logger = require('./logger');

function User(uuid, name, balance) {
  this.eventHandlers = {};

  this.uuid = uuid;
  this.name = name;
  this.balance = balance;
  this.socket = null;
  this.rooms = [];

  this.non('sub_lobby', this.onSub_Lobby);
  this.non_room('room_leave', this.onRoom_Leave);
  this.non_room('tbl_sitdown', this.onRoom_SitDown);
  this.non_room('tbl_standup', this.onRoom_StandUp);
  this.non_room('tbl_sitout', this.onRoom_SitOut);
  this.non_room('tbl_sitin', this.onRoom_SitIn);
  this.non_room('tbl_fold', this.onRoom_Fold);
  this.non_room('tbl_check', this.onRoom_Check);
  this.non_room('tbl_call', this.onRoom_Call);
  this.non_room('tbl_bet', this.onRoom_Bet);
  this.non_room('tbl_raise', this.onRoom_Raise);
}

User.prototype.non_room = function(cmd, handler) {
  this.non(cmd, function(data) {
    var room = this.findRoom(data.roomId);
    if (!room) {
      Logger.info('room action against unjoined room');
      Logger.trace();
      return;
    }

    handler.call(this, room, data);
  }.bind(this));
};

User.prototype.nemit = function(cmd, data) {
  if (this.socket) {
    this.socket.write([cmd, data]);
  }
};
User.prototype.ninvoke = function(cmd, data) {
  if (!this.eventHandlers[cmd]) {
    return;
  }

  var handlerList = this.eventHandlers[cmd];
  for (var i = 0; i < handlerList.length; ++i) {
    handlerList[i](data);
  }
};
User.prototype.non = function(cmd, handler) {
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
User.prototype.noff = function(cmd, handler) {
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
}

User.prototype.onConnect = function(socket) {
  this.socket = socket;

  for (var i = 0; i < this.rooms.length; ++i) {
    this.rooms[i].onUserConnect(this);
  }
};

User.prototype.onDisconnect = function() {
  this.socket = null;

  for (var i = 0; i < this.rooms.length; ++i) {
    this.rooms[i].onUserDisconnect(this);
  }
};

User.prototype.findRoom = function(roomId) {
  var foundRoom = null;
  for (var i = 0; i < this.rooms.length; ++i) {
    var room = this.rooms[i];
    if (room.id === data.roomId) {
      foundRoom = room;
      return;
    };
  }
  return foundRoom;
};


User.prototype.onSub_Lobby = function(data) {
  Logger.debug('subscribed to lobby');
};


User.prototype.onRoom_Leave = function(room, data) {
  var room = this.findRoom(data.roomId);
  if (!room) {
    Logger.info('user tried to leave room they are not in');
    return;
  }

  room.removeUser(this);
};
User.prototype.onRoom_SitDown = function(room, data) {
  var player = new poker.Player(this.uuid, this.name, data.buyIn);
  table.playerSit(data.pos, player);
};
User.prototype.onRoom_StandUp = function(room, data) {
  var seatIdx = room.getPosFromUuid(this.uuid);
  this.table.playerStandUp(seatIdx);
};
User.prototype.onRoom_SitIn = function(room, data) {
  var seatIdx = room.getPosFromUuid(this.uuid);
  this.table.playerSitIn(seatIdx);
};
User.prototype.onRoom_SitOut = function(room, data) {
  var seatIdx = room.getPosFromUuid(this.uuid);
  this.table.playerSitOut(seatIdx);
};
User.prototype.onRoom_Fold = function(room, data) {
  var seatIdx = room.getPosFromUuid(this.uuid);
  this.table.playerFold(seatIdx);
};
User.prototype.onRoom_Check = function(room, data) {
  var seatIdx = room.getPosFromUuid(this.uuid);
  this.table.playerCheck(seatIdx);
};
User.prototype.onRoom_Call = function(room, data) {
  var seatIdx = room.getPosFromUuid(this.uuid);
  this.table.playerCall(seatIdx);
};
User.prototype.onRoom_Bet = function(room, data) {
  var seatIdx = room.getPosFromUuid(this.uuid);
  this.table.playerBet(seatIdx, data.amount);
};
User.prototype.onRoom_Raise = function(room, data) {
  var seatIdx = room.getPosFromUuid(this.uuid);
  this.table.playerRaise(seatIdx, data.amount);
};

module.exports = User;
