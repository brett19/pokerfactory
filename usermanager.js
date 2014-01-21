var Logger = require('./logger');
var User = require('./user');

function UserManager() {
  this.users = {};
}

UserManager.prototype.loginUser = function(username, password, callback) {
  // TODO: Database load
  var uuid = username;

  if (password !== '') {
    callback(null);
    return;
  }

  var user = this.users[uuid];
  if (!user) {
    user = new User(uuid, username, 5000);
    this.users[uuid] = user;
  }

  Logger.debug('user', user.name, 'loaded');

  callback(user);
  return;
};

var userManager = new UserManager();
module.exports = function() { return userManager; };
