var Logger = require('./../common/logger');
var roomManager = require('./roommanager')();

function CashRoomManager() {
  this.rooms = [];

  this.checkRooms();
}

CashRoomManager.prototype.findRoomById = function(id) {
  for (var i = 0; i < this.rooms.length; ++i) {
    if (this.rooms[i].id === id) {
      return this.rooms[i];
    }
  }
  return null;
}

CashRoomManager.prototype.checkRooms = function() {
  // Testing Rooms
  if (this.rooms.length > 0) {
    return;
  }

  Logger.info('creating rooms');

  var testRoom1 = roomManager.createRoom(0, 'Test Room 1/2', {
    seatCount: 10,
    blindsDuration: 0,
    blindsLevels: [[1, 0]]
  });
  this.rooms.push(testRoom1);

  var testRoom2 = roomManager.createRoom(0, 'Test Room 2/4', {
    seatCount: 10,
    blindsDuration: 0,
    blindsLevels: [[2, 0]]
  });
  this.rooms.push(testRoom2);

  var testRoom3 = roomManager.createRoom(0, 'Test Room 10/20 w/ 2 Ante', {
    seatCount: 10,
    blindsDuration: 0,
    blindsLevels: [[10, 2]]
  });
  this.rooms.push(testRoom3);
};

var cashRoomManager = new CashRoomManager();
module.exports = function() { return cashRoomManager; };
