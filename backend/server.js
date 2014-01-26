var pubSub = require('../common/pubsub')();




pubSub.subscribe('auth', function(event, data, callback) {
  if (event === 'fblogin') {
    if (data.fbId && data.fbTkn) {
      callback({
        userId: 14
      });
    } else {
      callback({
        error: 'Invalid Login Details'
      });
    }
  }
});



var manager = ['localhost', 7600];
var backends = [
  ['localhost', 7700]
];
pubSub.bind('0.0.0.0', 7700);
pubSub.connect(manager[0], manager[1]);
