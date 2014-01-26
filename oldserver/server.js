'use strict';

var Express = require('express');
var Primus = require('primus');
var Poker = require('./poker');
var Logger = require('./logger');
var connManager = require('./connmanager')();

var app = Express();

app.use("/", Express.static(__dirname + '/../client'));

var server = require('http').createServer(app);
var primus = new Primus(server, {
  transformer: 'engine.io'
});


var table = new Poker.Table('000000', {
  seatCount: 4,
  blindsDuration: 5000,
  blindsLevels: [
    [100, 25],
    [200, 50],
    [400, 100],
    [1000, 250]
  ]
});

var listeners = [];
function allListeners(callback) {
  for (var i = 0; i < listeners.length; ++i) {
    callback(listeners[i]);
  }
}
function sendAll(cmd, data) {
  for (var i = 0; i < listeners.length; ++i) {
    listeners[i].write([cmd, data]);
  }
}

function startChips(name) {
  return 5000;
  return Math.floor(Math.random() * 2000) + 500;
}

primus.on('connection', function (spark) {
  spark.nemit = function(cmd, data) {
    spark.write([cmd, data]);
  }

  connManager.onConnect(spark);

  spark.on('data', function(data) {
    var cmd = data[0];
    var info = data[1];

    var myPos = table.getPosFromUuid(spark.uuid);

    if (cmd === 'login') {
      if (info.name) {
        listeners.push(spark);
        spark.uuid = info.name;
        spark.name = info.name;
        Logger.info('player_login', spark.name);
        spark.write(['open_table', table.info(spark.uuid)]);
      }
    } else if (cmd === 'sit_down') {
      Logger.info('player_sitdown', spark.name);
      var player = new Poker.Player(spark.uuid, spark.name, startChips(spark.name));
      table.playerSit(info.pos, player);
    } else if (cmd === 'act_fold') {
      table.playerFold(myPos);
    } else if (cmd === 'act_check') {
      table.playerCheck(myPos);
    } else if (cmd === 'act_call') {
      table.playerCall(myPos);
    } else if (cmd === 'act_bet') {
      table.playerBet(myPos, info.amount);
    } else if (cmd === 'act_raise') {
      table.playerRaise(myPos, info.amount);
    } else if (cmd === 'act_standup') {
      table.playerStandUp(myPos);
    } else if (cmd === 'act_sitout') {
      table.playerSitIn(myPos);
    } else if (cmd === 'act_sitin') {
      table.playerSitOut(myPos);
    }

    connManager.dispatch(spark, cmd, info);
  });
});
primus.on('disconnection', function (spark) {
  connManager.onDisconnect(spark);

  var lIdx = listeners.indexOf(spark);
  if (lIdx >= 0) {
    listeners.splice(lIdx, 1);
  }
});

table.on('player_sat', function(pos) {
  allListeners(function(spark) {
    spark.write(['player_sat', {
      pos: pos,
      info: table.playerInfo(spark.uuid, pos)
    }]);
  });
});

table.on('player_stood', function(pos) {
  allListeners(function(spark) {
    spark.write(['player_stood', {
      pos: pos
    }]);
  });
});

table.on('player_satin', function(pos) {
  allListeners(function(spark) {
    spark.write(['player_satin', {
      pos: pos
    }]);
  });
});

table.on('player_satout', function(pos) {
  allListeners(function(spark) {
    spark.write(['player_satout', {
      pos: pos
    }]);
  });
});

table.on('player_to_pot', function(pos, pot, amount) {
  allListeners(function(spark) {
    spark.write(['player_to_pot', {
      pos: pos,
      pot: pot,
      amount: amount
    }]);
  });
});

table.on('pot_to_player', function(pot, pos, amount) {
  allListeners(function(spark) {
    spark.write(['pot_to_player', {
      pot: pot,
      pos: pos,
      amount: amount
    }]);
  });
});

table.on('dealt_flop', function(card) {
  allListeners(function(spark) {
    spark.write(['community_deal_card', {card: table.communityCards[0]}]);
    spark.write(['community_deal_card', {card: table.communityCards[1]}]);
    spark.write(['community_deal_card', {card: table.communityCards[2]}]);
  });
});
table.on('dealt_turn', function(card) {
  allListeners(function(spark) {
    spark.write(['community_deal_card', {card: table.communityCards[3]}]);
  });
});
table.on('dealt_river', function(card) {
  allListeners(function(spark) {
    spark.write(['community_deal_card', {card: table.communityCards[4]}]);
  });
});

table.on('player_dealt_card', function(pos, card) {
  allListeners(function(spark) {
    var isMe = table.getPosFromUuid(spark.uuid) === pos;
    spark.write(['player_deal_card', {
      pos: pos,
      card: isMe ? card : -1
    }]);
  });
});

table.on('player_balance_changed', function(pos, balance) {
  allListeners(function(spark) {
    spark.write(['player_set_balance', {
      pos: pos,
      balance: balance
    }]);
  });
});

table.on('player_bet_changed', function(pos, bet) {
  allListeners(function(spark) {
    spark.write(['player_set_bet', {
      pos: pos,
      bet: bet
    }]);
  });
});

table.on('player_folded', function(pos) {
  allListeners(function(spark) {
    spark.write(['player_fold', {
      pos: pos
    }]);
  });
});

table.on('dealer_moved', function(pos) {
  allListeners(function(spark) {
    spark.write(['set_dealer', {
      pos: pos
    }]);
  });
});

table.on('action_moved', function(pos, timer, opts) {
  allListeners(function(spark) {
    var myPos = table.getPosFromUuid(spark.uuid);
    var myOptions = null;
    if (myPos !== -1) {
      myOptions = table.actionOpts(myPos);
    }

    spark.write(['set_action', {
      pos: pos,
      timer: timer,
      myopts: myPos !== -1 ? myOptions : null,

      // TODO: Remove This
      opts: pos === myPos ? myOptions : null
    }]);
  });
});

table.on('hand_finished', function(pos) {
  allListeners(function(spark) {
    spark.write(['hand_finished', {}]);
  });
});

table.on('player_show_hand', function(pos, hand) {
  allListeners(function(spark) {
    spark.write(['player_show_hand', {
      pos: pos,
      hand: hand
    }]);
  });
});

server.listen(4000);
