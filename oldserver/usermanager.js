var Logger = require('./logger');
var User = require('./user');

function UserManager() {
  this.users = {};
}

UserManager.prototype.loginUser = function(fbId, fbTkn, callback) {
  // TODO: Database load
  var uuid = fbId;

  var user = this.users[uuid];
  if (!user) {
    user = new User(uuid, fbId, 5000);
    this.users[uuid] = user;
  }

  Logger.debug('user', user.name, 'loaded');

  callback(user);
  return;
};

var userManager = new UserManager();
module.exports = function() { return userManager; };
