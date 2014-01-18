var Uuid = require('node-uuid');
var Logger = require('./logger');
var poker = require('./poker');

function Room(id, type, name, tableOpts) {
  this.id = id;
  this.uuid = Uuid.v4();
  this.name = name;
  this.type = type;
  this.tableOpts = tableOpts;

  this.table = new poker.Table(this.uuid, tableOpts);
  this.users = [];

  this.on_table('player_sat', this.onTable_PlayerSat);
}

Room.prototype.on_table = function(evt, handler) {
  this.table.on(evt, function() {
    handler.apply(this, arguments);
  }.bind(this));
};

Room.prototype._users = function(handler) {
  for (var i = 0; i < this.users.length; ++i) {
    handler.call(this, this.users[i]);
  }
};

Room.prototype.onTable_PlayerSat = function(pos) {
  this._users(function(user) {
    user.nemit('tbl_playersat', {
      pos: pos,
      info: this.table.playerInfo(user.uuid, pos)
    });
  });
};

Room.prototype.addUser = function(user) {
  var userIdx = this.users.indexOf(user);
  var roomIdx = user.rooms.indexOf(this);

  if (userIdx !== -1 && roomIdx !== -1) {
    Logger.warn('attempted to add user who is already in room');
    Logger.trace();
    return;
  }
  if (userIdx === -1 && roomIdx !== -1) {
    Logger.warn('attempted to add user who is partially in room : 1');
  }
  if (userIdx !== -1 && roomIdx === -1) {
    Logger.warn('attempted to add user who is partially in room : 2');
  }

  if (userIdx === -1) {
    this.users.push(user);
  }
  if (roomIdx === -1) {
    user.rooms.push(this);
  }
};

Room.prototype.removeUser = function(user) {
  var userIdx = this.users.indexOf(user);
  var roomIdx = user.rooms.indexOf(this);

  if (userIdx === -1 && roomIdx !== -1) {
    Logger.warn('attempted to remove user who is not at table');
    Logger.trace();
    return;
  }
  if (userIdx === -1 && roomIdx !== -1) {
    Logger.warn('attempted to remove user who is partially in room : 1');
  }
  if (userIdx !== -1 && roomIdx === -1) {
    Logger.warn('attempted to remove user who is partially in room : 2');
  }

  if (userIdx !== -1) {
    this.users.splice(userIdx, 1);
  }
  if (roomIdx !== -1) {
    user.rooms.splice(roomIdx, 1);
  }
};

Room.prototype.usersSeated = function() {
  return this.table.seatsTaken();
};

Room.prototype.usersSeatIdx = function(user) {
  return this.table.getPosFromUuid(user.uuid);
};

Room.prototype.userIsSeated = function(user) {
  return this.usersSeatIdx(user) >= 0;
};

Room.prototype.onUserConnect = function(user) {

};

Room.prototype.onUserDisconnect = function(user) {

};

module.exports = Room;
