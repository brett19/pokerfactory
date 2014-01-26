var Express = require('express');
var Primus = require('primus');
var pubSub = require('../common/pubsub')();

var app = Express();

app.use("/", Express.static(__dirname + '/../client'));

var server = require('http').createServer(app);
var primus = new Primus(server, {
  transformer: 'engine.io'
});

function handleLogin(client, data) {
  pubSub.request('auth', 'fblogin', {
    fbId: data.fbId,
    fbTkn: data.fbTkn
  }, function(err, res) {
    if (err) {
      client.write(['login_result', 'Temporary failure.', null]);
      return;
    } else if (res.error) {
      client.write(['login_result', res.error, null]);
      return;
    }

    if (res.userId) {
      client.userId = res.userId;
    }

    client.write(['login_result', null, res.userId]);
  }, 2000);
}

primus.on('connection', function(spark) {
  spark.nemit = function(cmd, data) {
    spark.write([cmd, data]);
  };
  spark._ninvoke = function(cmd, data) {
    if (cmd === 'login') {
      handleLogin(spark, data);
    }
  };

  spark.on('data', function(data) {
    spark._ninvoke(data[0], data[1]);
  });
});
primus.on('disconnection', function (spark) {
  spark.userId = 0;
});







var manager = ['localhost', 7600];
var backends = [
  ['localhost', 7700]
];

pubSub.bind('0.0.0.0', 7500);
pubSub.connect(manager[0], manager[1]);
for (var i = 0; i < backends.length; ++i) {
  pubSub.connect(backends[i][0], backends[i][1]);
}

server.listen(4000);
