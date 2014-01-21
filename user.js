var Logger = require('./logger');
var Poker = require('./poker');
var cashRoomManager = require('./cashroommanager')();

function User(uuid, name, balance) {
  this.eventHandlers = {};

  this.uuid = uuid;
  this.name = name;
  this.balance = balance;
  this.socket = null;
  this.rooms = [];

  this.non('sub_lobby', this.onSub_Lobby);
  this.non('game_joincashroom', this.onGame_JoinCashRoom);
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
  console.log(this.uuid, cmd);
  if (this.socket) {
    this.socket.write([cmd, data]);
  }
};
User.prototype.ninvoke = function(cmd, data) {
  if (!this.eventHandlers[cmd]) {
    return;
  }

  if (!data) {
    data = {};
  }

  var handlerList = this.eventHandlers[cmd];
  for (var i = 0; i < handlerList.length; ++i) {
    handlerList[i].call(this, data);
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
  for (var i = 0; i < this.rooms.length; ++i) {
    var room = this.rooms[i];
    if (room.id === roomId) {
      return room;
    };
  }
  return null;
};


User.prototype.onSub_Lobby = function(data) {
  Logger.debug('subscribed to lobby');
};


User.prototype.onGame_JoinCashRoom = function(data) {
  Logger.debug('user joining room :', data.id);

  var room = cashRoomManager.findRoomById(data.id);
  if (!room) {
    Logger.warn('tried to join invalid cash room');
    return;
  }

  room.addUser(this);
  room.onUserConnect(this);
};


User.prototype.onRoom_Leave = function(room, data) {
  var room = this.findRoom(data.roomId);
  if (!room) {
    Logger.info('user tried to leave room they are not in');
    return;
  }

  room.onUserDisconnect(this);
  room.removeUser(this);
};
User.prototype.onRoom_SitDown = function(room, data) {
  var player = new Poker.Player(this.uuid, this.name, data.buyIn);
  room.table.playerSit(data.seatIdx, player);
};
User.prototype.onRoom_StandUp = function(room, data) {
  var seatIdx = room.table.getPosFromUuid(this.uuid);
  room.table.playerStandUp(seatIdx);
};
User.prototype.onRoom_SitIn = function(room, data) {
  var seatIdx = room.table.getPosFromUuid(this.uuid);
  room.table.playerSitIn(seatIdx);
};
User.prototype.onRoom_SitOut = function(room, data) {
  var seatIdx = room.table.getPosFromUuid(this.uuid);
  room.table.playerSitOut(seatIdx);
};
User.prototype.onRoom_Fold = function(room, data) {
  var seatIdx = room.table.getPosFromUuid(this.uuid);
  room.table.playerFold(seatIdx);
};
User.prototype.onRoom_Check = function(room, data) {
  var seatIdx = room.table.getPosFromUuid(this.uuid);
  room.table.playerCheck(seatIdx);
};
User.prototype.onRoom_Call = function(room, data) {
  var seatIdx = room.table.getPosFromUuid(this.uuid);
  room.table.playerCall(seatIdx);
};
User.prototype.onRoom_Bet = function(room, data) {
  var seatIdx = room.table.getPosFromUuid(this.uuid);
  room.table.playerBet(seatIdx, data.amount);
};
User.prototype.onRoom_Raise = function(room, data) {
  var seatIdx = room.table.getPosFromUuid(this.uuid);
  room.table.playerRaise(seatIdx, data.amount);
};

module.exports = User;
