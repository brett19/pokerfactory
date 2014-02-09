var pubSub = require('./../common/pubsub')();

function LobbyManager() {
  this.ticker = null;
}

LobbyManager.prototype.start = function() {
  this.resetTicker();
};

LobbyManager.prototype.resetTicker = function() {
  if (this.ticker) {
    clearInterval(this.ticker);
    this.ticker = null;
  }

  this.ticker = setInterval(this.tick.bind(this), 2000);
};

LobbyManager.prototype.tick = function() {
  this.publishUpdate();
};

LobbyManager.prototype.cashRoomsChanged = function() {
  this.resetTicker();
  this.publishUpdate();
};

LobbyManager.prototype.publishUpdate = function() {
  var cashRoomManager = require('./cashroommanager')();

  var roomData = {
    cashGames: [],
    tournys: [],
    sitngos: []
  };

  for (var i = 0; i < cashRoomManager.rooms.length; ++i) {
    var room = cashRoomManager.rooms[i];

    roomData.cashGames.push({
      id: room.id,
      name: room.name,
      seatCount: room.seatCount(),
      seatedCount: room.seatedCount(),
      smallBlind: room.currentBlinds(),
      bigBlind: room.currentBlinds()*2
    });
  }

  pubSub.publish('lobby', 'rooms', roomData);
};

var lobbyManager = new LobbyManager();
module.exports = function() { return lobbyManager; };