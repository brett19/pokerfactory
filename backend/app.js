var Logger = require('../common/logger');
var pubSub = require('../common/pubsub')();
var facebook = require('./facebook')();
var User = require('./models/user');
var lobbyManager = require('./lobbymanager')();
var cashRoomManager = require('./cashroommanager')(); // Imported just to start it for now...

pubSub.subscribe('auth', function(event, data, src, callback) {
  if (event === 'fblogin') {
    console.log('auth:fblogin');

    facebook.validateUser(data.fbId, data.fbTkn, function(err, fbUser) {
      if (err) {
        return callback(err);
      }

      User.findOrCreateFromFbUser(fbUser, function(err, user) {
        if (err) {
          return callback(err);
        }

        callback(null, {
          userId: user.id,
          balance: user.balance
        });
      });
    })
  }
});

lobbyManager.start();

Logger.info('Started backend service.');
