var lobbyManager = require('./lobbymanager')();

function ConnManager() {
}

ConnManager.prototype.onConnect = function(socket) {
  socket.user = null;
};

ConnManager.prototype.onDisconnect = function(socket) {
  lobbyManager.removeSocket(socket);

  if (socket.user) {
    socket.user.onDisconnect();
    socket.user = null;
  }
};

ConnManager.prototype.dispatch = function(socket, cmd, data) {
  if (cmd === 'login') {
    userManager.loginUser(data.name, '', function(user) {
      if (!user) {
        // Invalid username/password
        Logger.debug('login attempt with bad user/pass');
        return;
      }

      var origSocket = user.socket;
      if (origSocket) {
        user.onDisconnect();
        origSocket.user = null;
        origSocket.end();
      }

      socket.user = user;
      user.onConnect(socket);
    });
  } else if (cmd === 'sub_lobby') {
    lobbyManager.addSocket(socket);
  }

  // Dispatch to the user themselves as well.
  var user = socket.user;
  if (user) {
    user.ninvoke(cmd, data);
  }
};

var connManager = new ConnManager();
module.exports = function() { return connManager; };
