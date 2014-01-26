var Primus = require('primus');
var Socket = Primus.createSocket({transformer: 'engine.io'});

var client = new Socket('http://localhost:4000');

client.on('data', function(data) {
  console.log('socket.data', data);
  process.exit();
});

client.write(['login', {
  fbId: '601101011',
  fbTkn: 'test_access_token'
}]);
