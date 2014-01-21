var cashRoomManager = require('./cashroommanager')();

function LobbyManager() {
  this.sockets = [];
  this.lastDispatchIdx = 0;

  setInterval(function() {
    this.dispatchSome();
  }.bind(this), 2000);
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
  var totalDispatch = Math.ceil(this.sockets.length / 10);
  if (totalDispatch > this.sockets.length) {
    totalDispatch = this.sockets.length;
  }

  for (var i = 0; i < totalDispatch; ++i) {
    this.lastDispatchIdx++;
    if (this.lastDispatchIdx >= this.sockets.length) {
      this.lastDispatchIdx = 0;
    }
    var thisIdx = this.lastDispatchIdx;

    this.sendLobbyData(this.sockets[thisIdx]);
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
      seatCount: room.seatCount(),
      smallBlind: room.currentBlinds(),
      bigBlind: room.currentBlinds() * 2
    });
  }

  socket.nemit('game_lobby', {
    cashGames: cashGames,
    tournaments: []
  });
};

var lobbyManager = new LobbyManager();
module.exports = function() { return lobbyManager; };
