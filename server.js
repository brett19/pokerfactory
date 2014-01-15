'use strict';

var express = require('express');
var Primus = require('primus');
var poker = require('./poker');

var app = express();

app.use("/", express.static(__dirname + '/client'));

var server = require('http').createServer(app);
var primus = new Primus(server, {
  transformer: 'engine.io'
});

var table = new poker.Table('000000', 'Main');

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
  return Math.floor(Math.random() * 2000) + 500;
}

primus.on('connection', function (spark) {
  spark.on('data', function(data) {
    var cmd = data[0];
    var info = data[1];

    var myPos = table.getUuidPos(spark.uuid);

    if (cmd === 'login') {
      listeners.push(spark);
      spark.uuid = info.name;
      spark.name = info.name;
      console.log('player_login', spark.name);
      spark.write(['open_table', table.info(spark.uuid)]);
    } else if (cmd === 'sit_down') {
      console.log('player_sitdown', spark.name);
      var player = new poker.Player(spark.uuid, spark.name, startChips(spark.name));
      table.sitPlayer(info.pos, player);
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
      table.standPlayer(myPos);
    } else if (cmd === 'act_sitout') {
      table.sitoutPlayer(myPos, true);
    } else if (cmd === 'act_sitin') {
      table.sitoutPlayer(myPos, false);
    }
  });
});
primus.on('disconnection', function (spark) {
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

table.on('community_dealt_card', function(card) {
  allListeners(function(spark) {
    spark.write(['community_deal_card', {
      card: card
    }]);
  });
});

table.on('player_dealt_card', function(pos, card) {
  allListeners(function(spark) {
    var isMe = table.getUuidPos(spark.uuid) === pos;
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
    var isMe = table.getUuidPos(spark.uuid) === pos;
    spark.write(['set_action', {
      pos: pos,
      timer: timer,
      opts: isMe ? opts : null
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
