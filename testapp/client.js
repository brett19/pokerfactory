var Primus = require('primus');
var Socket = Primus.createSocket({transformer: 'engine.io'});

var client = new Socket('http://localhost:5000');

var stime = null;
function shutdown() {
  var dtime = process.hrtime(stime);
  console.log(Math.ceil(dtime[0] * 1e3 + dtime[1] / 1e6));
  process.exit(0);
}

client.on('data', function(data) {
  console.log('socket.data', data);
  shutdown();
});

client.on('open', function(data) {
  console.log('socket opened');

  stime = process.hrtime();

  client.write(['login', {
    fbId: '601060001',
    fbTkn: 'super_secret_debug_token'
  }]);
});
