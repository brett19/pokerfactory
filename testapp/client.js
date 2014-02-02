var util = require('util');
var Primus = require('primus');
var Socket = Primus.createSocket({transformer: 'engine.io'});

var client = new Socket('http://localhost:4000');

client.on('data', function(data) {
  console.log('socket.data', util.inspect(data, {depth:4}));
});

client.on('open', function(data) {
  console.log('socket opened');

  client.write(['login', {
    fbId: '601060001',
    fbTkn: 'super_secret_debug_token'
  }]);
});
