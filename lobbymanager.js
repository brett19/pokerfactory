var cashRoomManager = require('./cashroommanager')();

function LobbyManager() {
  this.sockets = [];
}
LobbyManager.prototype.addSocket = function(socket) {
  this.sockets.push(socket);
  this.sendLobbyData(socket);
};
LobbyManager.prototype.removeSocket = function(socket) {
  var socketIdx = this.sockets.indexOf(socket);
  if (socketIdx >= 0) {
    this.sockets.splice(socketIdx, 1);
  }
};
LobbyManager.prototype.dispatchSome = function() {
  // TODO: Make this only do some players at a time.
  for (var i = 0; i < this.sockets.length; ++i) {
    this.sendLobbyData(this.sockets[i]);
  }
};

LobbyManager.prototype.sendLobbyData = function(socket) {
  var cashGames = [];
  for (var i = 0; i < cashRoomManager.rooms.length; ++i) {
    var room = cashRoomManager.rooms[i];
    cashGames.push({
      id: room.id,
      name: room.name,
      seatedCount: room.usersSeated(),
      seatCount: room.tableOpts.seatCount,
      smallBlind: room.tableOpts.blinds[0][0],
      bigBlind: room.tableOpts.blinds[0][0] * 2
    });
  }

  socket.nemit('game_lobby', {
    cashGames: cashGames,
    tournaments: []
  });
};

var lobbyManager = new LobbyManager();
module.exports = function() { return lobbyManager; };
