var Logger = require('./logger');
var roomManager = require('./roommanager')();

function CashRoomManager() {
  this.rooms = [];

  this.checkRooms();
}

CashRoomManager.prototype.checkRooms = function() {
  // Testing Rooms
  if (this.rooms.length > 0) {
    return;
  }

  Logger.info('creating rooms');

  var testRoom1 = roomManager.createRoom(0, 'Test Room 1c/2c', {
    seatCount: 4,
    blindDuration: 0,
    blinds: [[1, 0]]
  });
  this.rooms.push(testRoom1);

  var testRoom2 = roomManager.createRoom(0, 'Test Room 2c/4c', {
    seatCount: 4,
    blindDuration: 0,
    blinds: [[2, 0]]
  });
  this.rooms.push(testRoom2);
};

var cashRoomManager = new CashRoomManager();
module.exports = function() { return cashRoomManager; };
