var Logger = require('../common/logger');
var pubSub = require('../common/pubsub')();
var facebook = require('./facebook')();
var User = require('./models/user');
var cashRoomManager = require('./cashroommanager')();

pubSub.subscribe('auth', function(src, event, data, callback) {
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

setInterval(function() {
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
}, 15000);

Logger.info('Started backend service.');
