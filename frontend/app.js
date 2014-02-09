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
  this.srcUuid = null;
  this.__handleRoomEvent = this._handleRoomEvent.bind(this);
  pubSub.subscribe('roomevt_' + this.roomId, this.__handleRoomEvent);

  pubSub.request('roomact_' + this.roomId, 'join', {
    userId: this.client.userId
  }, function(err, res, src) {
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
    this.srcUuid = src.uuid;
    this._forwardEvent('room_joined', res);
  }.bind(this), 4000);
}

UserRoomHandler.prototype.destroy = function() {
  console.log('UserRoomHandler destroying');
  pubSub.unsubscribe('roomevt_' + this.roomId, this.__handleRoomEvent);
  this.state = UserRoomState.DESTROYED;
};

UserRoomHandler.prototype._forwardEvent = function(event, data) {
  if (!data) {
    data = {};
  }
  data.roomId = this.roomId;
  this.client.nemit(event, null, data);
};

UserRoomHandler.prototype._handleRoomEvent = function(event, data) {
  if (this.state !== UserRoomState.JOINED) {
    if (this.state !== UserRoomState.JOINING) {
      console.warn('received unexpected event from UserRoomHandler');
    }
    return;
  }

  if (event === 'tbl_dealthands') {
    var hands = [];
    for (var i = 0; i < data.hands.length; ++i) {
      var hand = data.hands[i];
      if (!hand) {
        hands.push(null);
      } else if (hand.userId === this.client.userId) {
        hands.push(hand.userHand);
      } else {
        hands.push(hand.hand);
      }
    }

    this._forwardEvent('tbl_dealthands', {
      hands: hands
    });
  } else if (event === 'tbl_options') {
    var myOptions = data.options[this.client.userId];
    if (myOptions) {
      this._forwardEvent('tbl_options', myOptions);
    }
  } else if (event === 'tbl_playersat') {
    // TODO: Fix this hack!
    if (data.userId === this.client.userId) {
      data.state.myself = true;
    } else {
      data.state.myself = false;
    }

    this._forwardEvent(event, data);
  } else if (event === 'tbl_playerstood') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_playersatin') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_playersatout') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_playerbettopot') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_pottoplayer') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_dealtcommunity') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_playerbalancechanged') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_playerbetchanged') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_dealermoved') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_actionmoved') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_potraked') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_handstarted') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_handfinished') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_exposehand') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_playerfolded') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_playerchecked') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_playercalled') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_playerbet') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_playerraised') {
    this._forwardEvent(event, data);
  } else if (event === 'tbl_chat') {
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

  spark._userChannelHandler = function(event, data, src) {

  }.bind(spark);

  spark._forwardRoomEvent = function(event, data) {
    var roomId = data.roomId;
    delete data.roomId;
    data.userId = this.userId;
    pubSub.publish('roomact_' + roomId, event, data);
  };

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
      } else if (cmd === 'room_sitdown') {
        spark._forwardRoomEvent('sitdown', data);
      } else if (cmd === 'tbl_standup') {
        spark._forwardRoomEvent('standup', data);
      } else if (cmd === 'tbl_sitin') {
        spark._forwardRoomEvent('sitin', data);
      } else if (cmd === 'tbl_sitout') {
        spark._forwardRoomEvent('sitout', data);
      } else if (cmd === 'tbl_fold') {
        spark._forwardRoomEvent('fold', data);
      } else if (cmd === 'tbl_check') {
        spark._forwardRoomEvent('check', data);
      } else if (cmd === 'tbl_call') {
        spark._forwardRoomEvent('call', data);
      } else if (cmd === 'tbl_bet') {
        spark._forwardRoomEvent('bet', data);
      } else if (cmd === 'tbl_raise') {
        spark._forwardRoomEvent('raise', data);
      } else if (cmd === 'tbl_chat') {
        spark._forwardRoomEvent('chat', data);
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
pubSub.subscribe('lobby', function(event, data, src, callback) {
  if (event === 'rooms') {
    lobbyCache[src.uuid] = data;

    /* disabled for now
    nemitAll('roomgroup_updated', {
      group_name: src.uuid,
      rooms: data
    })
    */
  }
});
pubSub.on('disconnected', function(who) {
  if (lobbyCache[who.uuid]) {
    delete lobbyCache[who.uuid];

    nemitAll('roomgroup_gone', {
      group_name: who.uuid
    });
  }

  for (var i = 0; i < connectedClients.length; ++i) {
    var client = connectedClients[i];
    var newRoomList = [];
    for (var j = 0; j < client.rooms.length; ++j) {
      var userRoom = client.rooms[j];
      console.log('x', userRoom.srcUuid, who.uuid);
      if (userRoom.srcUuid === who.uuid) {
        client.nemit('room_crashed', null, {
          roomId: userRoom.roomId
        });
        userRoom.destroy();
      } else {
        newRoomList.push(userRoom);
      }
    }
    client.rooms = newRoomList;
  }
});


server.listen(4000);
Logger.info('Started frontend service.');
