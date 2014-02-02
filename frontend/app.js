var Express = require('express');
var Primus = require('primus');
var Uuid = require('node-uuid');
var Logger = require('../common/logger');
var Errors = require('../common/errors');
var pubSub = require('../common/pubsub')();

var app = Express();

app.use("/", Express.static(__dirname + '/public'));

var server = require('http').createServer(app);
var primus = new Primus(server, {
  transformer: 'engine.io'
});



function nemitAll(cmd, data) {
  for (var i = 0; i < connectedClients.length; ++i) {
    if (!connectedClients[i].userId) {
      continue;
    }
    connectedClients[i].nemit(cmd, null, data);
  }
}

function userPublish(userId, event, data) {
  pubSub.publish('useract_' + userId, event, data);
}



function cmd_login(client, data) {
  pubSub.request('auth', 'fblogin', {
    fbId: data.fbId,
    fbTkn: data.fbTkn
  }, function(err, res) {
    console.log('auth:fblogin reply');
    if (err && err === true) {
      return client.write(['login_result', null, Errors.tempInternal()]);
    } else if (err) {
      return client.write(['login_result', null, err]);
    }

    if (!res.userId) {
      console.warn('received fblogin reply without userId');
      return;
    }

    client.sessionId = Uuid.v4();
    client.userId = res.userId;
    userPublish(client.userId, 'connected', {
      sessionId: client.sessionId
    });

    pubSub.subscribe('user_' + client.userId, client._userChannelHandler);

    client.nemit('login_result', null, {
      sessionId: client.sessionId,
      userId: client.userId,
      balance: res.balance
    });

    client.nemit('rooms_list', null, lobbyCache);
  }, 4000);
}

var UserRoomState = {
  DESTROYED: 0,
  JOINING: 1,
  JOINED: 2
}

function UserRoomHandler(client, roomId) {
  this.client = client;
  this.roomId = roomId;
  this.state = UserRoomState.JOINING;
  this.__handleRoomEvent = this._handleRoomEvent.bind(this);
  pubSub.subscribe('roomevt_' + this.roomId, this.__handleRoomEvent);

  pubSub.request('roomact_' + this.roomId, 'join', {
    userId: this.client.userId
  }, function(err, res) {
    console.log('roomact::join reply');

    if (this.state !== UserRoomState.JOINING) {
      return;
    }

    if (err && err === true) {
      this.destroy();
      return client.write(['joincashroom_result', null, Errors.tempInternal()]);
    } else if (err) {
      this.destroy();
      return client.write(['joincashroom_result', null, err]);
    }

    this.state = UserRoomState.JOINED;
    this._forwardEvent('room_joined', res);
  }.bind(this), 4000);
}

UserRoomHandler.prototype.destroy = function() {
  pubSub.unsubscribe('roomevt_' + this.roomId, this.__handleRoomEvent);
  this.state = UserRoomState.DESTROYED;
};

UserRoomHandler.prototype._forwardEvent = function(event, data) {
  data.roomId = this.roomId;
  this.client.nemit(event, null, data);
};

UserRoomHandler.prototype._handleRoomEvent = function(src, event, data) {
  if (this.state !== UserRoomState.JOINED) {
    if (this.state !== UserRoomState.JOINING) {
      console.warn('received unexpected event from UserRoomHandler');
    }
    return;
  }

  if (event === 'tbl_idle') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_playersat') {
    this._forwardEvent(event, data);
  }
};

function cmd_joincashroom(client, data) {
  var roomHandler = new UserRoomHandler(client, data.id);
  client.rooms.push(roomHandler);
}

function cmd_roomleft(client, data) {
  var roomIdx = -1;
  for (var i = 0; i < client.rooms.length; ++i) {
    if (data.roomId === client.rooms[i].roomId) {
      roomIdx = i;
      break;
    }
  }

  if (roomIdx === -1) {
    console.warn('tried to leave room that user is not in');
    return;
  }

  client.rooms[roomIdx].destroy();
  client.rooms.splice(roomIdx, 1);
}


var connectedClients = [];
primus.on('connection', function(spark) {
  connectedClients.push(spark);

  spark.sessionId = Uuid.v4();
  spark.userId = 0;
  spark.rooms = [];

  spark._userChannelHandler = function(src, event, data) {

  }.bind(spark);

  spark.nemit = function(cmd, err, data) {
    if (!err) {
      spark.write([cmd, data, err]);
    } else {
      spark.write([cmd, data]);
    }
  };
  spark._ninvoke = function(cmd, data) {
    console.log('_ninvoke', cmd, data);
    if (cmd === 'login') {
      cmd_login(spark, data);
    } else if (spark.userId !== 0) {
      if (cmd === 'joincashroom') {
        cmd_joincashroom(spark, data);
      } else if (cmd === 'room_left') {
        cmd_roomleft(spark, data);
      }
    }
  };

  spark.on('data', function(data) {
    spark._ninvoke(data[0], data[1]);
  });
});
primus.on('disconnection', function (spark) {
  if (spark.userId && spark.sessionId) {
    userPublish(spark.userId, 'disconnected', {
      sessionId: spark.sessionId
    });
    spark.userId = 0;
  }

  var clientIdx = connectedClients.indexOf(spark);
  if (clientIdx !== -1) {
    connectedClients.splice(clientIdx, 1);
  }
});


var lobbyCache = {};
pubSub.subscribe('lobby', function(src, event, data) {
  if (event === 'rooms') {
    lobbyCache[src.uuid] = data;

    nemitAll('roomgroup_updated', {
      group_name: src.uuid,
      rooms: data
    })
  }
});
pubSub.on('disconnected', function(who) {
  if (lobbyCache[who.uuid]) {
    delete lobbyCache[who.uuid];

    nemitAll('roomgroup_gone', {
      group_name: who.uuid
    });
  }
});


server.listen(4000);
Logger.info('Started frontend service.');
