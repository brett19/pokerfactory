var Logger = require('./logger');
var Room = require('./room');

function RoomManager() {
  this.roomIdCounter = 1;
  this.rooms = {};
}

RoomManager.prototype.createRoom = function(type, name, tableOpts) {
  var roomId = this.roomIdCounter++;
  var room = new Room(roomId, type, name, tableOpts);
  this.rooms[room.uuid] = room;
  return room;
};

RoomManager.prototype.destroyRoom = function(uuid) {
  var room = this.rooms[uuid];
  if (!room) {
    Logger.warn('tried to destroy a room that does not exist');
    return;
  }
};

var roomManager = new RoomManager();
module.exports = function() { return roomManager; };
