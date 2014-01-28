var Express = require('express');
var Primus = require('primus');
var Logger = require('../common/logger');
var Errors = require('../common/errors');
var pubSub = require('../common/pubsub')();

var app = Express();

app.use("/", Express.static(__dirname + '/public'));

var server = require('http').createServer(app);
var primus = new Primus(server, {
  transformer: 'engine.io'
});

function cmd_login(client, data) {
  pubSub.request('auth', 'fblogin', {
    fbId: data.fbId,
    fbTkn: data.fbTkn
  }, function(err, res) {
    if (err && err === true) {
      return client.write(['login_result', null, Errors.tempInternal()]);
    } else if (err) {
      return client.write(['login_result', null, err]);
    }

    if (res.userId) {
      client.userId = res.userId;
    }

    client.write(['login_result', null, res]);
  }, 4000);
}

primus.on('connection', function(spark) {
  spark.nemit = function(cmd, data) {
    spark.write([cmd, data]);
  };
  spark._ninvoke = function(cmd, data) {
    if (cmd === 'login') {
      cmd_login(spark, data);
    }
  };

  spark.on('data', function(data) {
    spark._ninvoke(data[0], data[1]);
  });
});
primus.on('disconnection', function (spark) {
  spark.userId = 0;
});

server.listen(5000);

Logger.info('Started frontend service.');
