var Uuid = require('node-uuid');
var Logger = require('./../common/logger');
var pubSub = require('./../common/pubsub')();
var poker = require('./pokersim/poker');

function userPublish(userId, event, data) {
  pubSub.publish('userevt_' + userId, event, data);
}

var RoomUserState = {
  DESTROYED: 0,
  CONNECTED: 1,
  DISCONNECTED: 2
};

function RoomUser(room, userId) {
  this.room = room;
  this.userId = userId;
  this.state = RoomUserState.CONNECTED;

  this.__handleUserEvent = this._handleUserEvent.bind(this);

  pubSub.subscribe('useract_' + this.userId, this.__handleUserEvent);
}

RoomUser.prototype.destroy = function() {
  pubSub.unsubscribe('user_act' + this.userId, this.__handleUserEvent);
}

RoomUser.prototype._handleUserEvent = function(src, event, data) {
  if (this.state === RoomUserState.DISCONNECTED) {
    console.warn('received unexpected event from RoomUser');
    return;
  }

  if (event === 'connected') {
    this.state = RoomUserState.CONNECTED;
  } else if (event === 'disconnected') {
    this.state = RoomUserState.DISCONNECTED;
  }
};

function Room(type, name, tableOpts) {
  // ID is just the UUID for now
  this.uuid = Uuid.v4();
  this.id = this.uuid;
  this.name = name;
  this.type = type;

  this.table = new poker.Table(tableOpts);

  this.seats = [];
  for (var i = 0; i < this.table.seatCount(); ++i) {
    this.seats.push(null);
  }

  this._tableOn('player_sat', this.onTable_PlayerSat);
  this._tableOn('player_stood', this.onTable_PlayerStood);
  this._tableOn('player_satin', this.onTable_PlayerSatIn);
  this._tableOn('player_satout', this.onTable_PlayerSatOut);
  this._tableOn('player_to_pot', this.onTable_PlayerToPot);
  this._tableOn('pot_to_player', this.onTable_PotToPlayer);
  this._tableOn('dealt_flop', this.onTable_DealtFlop);
  this._tableOn('dealt_turn', this.onTable_DealtTurn);
  this._tableOn('dealt_river', this.onTable_DealtRiver);
  this._tableOn('dealt_hands', this.onTable_DealtHands);
  this._tableOn('player_balance_changed', this.onTable_PlayerBalanceChanged);
  this._tableOn('player_bet_changed', this.onTable_PlayerBetChanged);
  this._tableOn('dealer_moved', this.onTable_DealerMoved);
  this._tableOn('action_moved', this.onTable_ActionMoved);
  this._tableOn('pot_raked', this.onTable_PotRaked);
  this._tableOn('hand_started', this.onTable_HandStarted);
  this._tableOn('hand_finished', this.onTable_HandFinished);
  this._tableOn('player_show_hand', this.onTable_PlayerExposeCards);
  this._tableOn('player_folded', this.onTable_PlayerFolded);
  this._tableOn('player_checked', this.onTable_PlayerChecked);
  this._tableOn('player_called', this.onTable_PlayerCalled);
  this._tableOn('player_bet', this.onTable_PlayerBet);
  this._tableOn('player_raised', this.onTable_PlayerRaised);

  this._roomActHandler = function(src, event, data, callback) {
    if (event === 'join') {
      console.log('User Join!', data);

      var userSeatIdx = this.usersSeatIdx(data.userId);
      var tableState = this.table.info(userSeatIdx);

      callback(null, {
        name: this.name,
        state: tableState
      });
    } else if (event === 'sitdown') {
      console.log('User Sit!', data);


    }
  }.bind(this);
  pubSub.subscribe('roomact_' + this.id, this._roomActHandler);

  // For Testing!
  setInterval(function() {
    this.roomPublish('tbl_idle', {});
  }.bind(this), 2500);
}

Room.prototype.destroy = function() {
  pubSub.unsubscribe('roomact_' + this.id, this._roomActHandler);
};

Room.prototype._tableOn = function (evt, handler) {
  this.table.on(evt, function() {
    handler.apply(this, arguments);
  }.bind(this));
};

Room.prototype.roomPublish = function(event, data) {
  pubSub.publish('roomevt_' + this.uuid, event, data);
};

Room.prototype.currentBlinds = function() {
  return this.table.blinds;
};

Room.prototype.seatCount = function() {
  return this.table.seatCount();
};

Room.prototype.seatedCount = function() {
  return this.table.seatedCount();
};

Room.prototype.usersSeatIdx = function(userId) {
  for (var i = 0; i < this.seats.length; ++i) {
    if (this.seats[i].userId === userId) {
      return i;
    }
  }
  return -1;
};

Room.prototype.userIsSeated = function(userId) {
  return this.usersSeatIdx(userId) !== -1;
};




Room.prototype.onTable_PlayerSat = function(seatIdx) {
  this.roomPublish('tbl_playersat', {
    seatIdx: seatIdx,
    state: this.table.playerInfo(null, seatIdx)
  });
};

Room.prototype.onTable_PlayerStood = function(seatIdx) {
  this.roomPublish('tbl_playerstood', {
    seatIdx: seatIdx
  });
};

Room.prototype.onTable_PlayerSatIn = function(seatIdx) {
  this.roomPublish('tbl_playersatin', {
    seatIdx: seatIdx
  });
};

Room.prototype.onTable_PlayerSatOut = function(seatIdx) {
  this.roomPublish('tbl_playersatout', {
    seatIdx: seatIdx
  });
};

Room.prototype.onTable_PlayerToPot = function(seatIdx, potIdx, amount) {
  this.roomPublish('tbl_playerbettopot', {
    seatIdx: seatIdx,
    potIdx: potIdx,
    amount: amount
  });
};

Room.prototype.onTable_PotToPlayer = function(potIdx, seatIdx, amount) {
  this.roomPublish('tbl_pottoplayer', {
    potIdx: potIdx,
    seatIdx: seatIdx,
    amount: amount
  });
};

Room.prototype.onTable_DealtFlop = function() {
  this.roomPublish('tbl_dealtcommunity', {
    cards: [
      this.table.communityCards[0],
      this.table.communityCards[1],
      this.table.communityCards[2]
    ]
  });
};

Room.prototype.onTable_DealtTurn = function() {
  this.roomPublish('tbl_dealtcommunity', {
    cards: [
      this.table.communityCards[3]
    ]
  });
};

Room.prototype.onTable_DealtRiver = function() {
  this.roomPublish('tbl_dealtcommunity', {
    cards: [
      this.table.communityCards[4]
    ]
  });
};

Room.prototype.onTable_DealtHands = function() {
  var hands = [];
  for (var i = 0; i < this.seatCount(); ++i) {
    var holeCards = this.table.seats[i].holeCards;
    var user = this.seats[i];

    var hidyCards = [];
    for (var j = 0; j < holeCards.length; ++i) {
      hidyCards.push(-1);
    }

    hands.push({
      userId: user.userId,
      userHand: holeCards,
      hand: hidyCards
    });
  }

  this.roomPublish('tbl_dealthands', {
    hands: hands
  });
};

Room.prototype.onTable_PlayerBalanceChanged = function(seatIdx, balance) {
  this.roomPublish('tbl_playerbalancechanged', {
    seatIdx: seatIdx,
    balance: balance
  });
};

Room.prototype.onTable_PlayerBetChanged = function(seatIdx, bet) {
  this.roomPublish('tbl_playerbetchanged', {
    seatIdx: seatIdx,
    bet: bet
  });
};

Room.prototype.onTable_DealerMoved = function(seatIdx) {
  this.roomPublish('tbl_dealermoved', {
    seatIdx: seatIdx
  });
};

Room.prototype.onTable_ActionMoved = function(seatIdx, timer) {
  var userOptions = {};
  for (var i = 0; i < this.seatCount(); ++i) {
    var user = this.seats[i];
    if (!user) {
      continue;
    }
    userOptions[user.userId] = this.table.actionOpts(i);
  }
  this.roomPublish('tbl_options', {
    options: userOptions
  });

  this.roomPublish('tbl_actionmoved', {
    seatIdx: seatIdx,
    timer: timer
  });
};

Room.prototype.onTable_PotRaked = function(potIdx, amount) {
  this.roomPublish('tbl_potraked', {
    potIdx: potIdx,
    amount: amount
  });
};

Room.prototype.onTable_HandStarted = function() {
  this.roomPublish('tbl_handstarted');
};

Room.prototype.onTable_HandFinished = function() {
  this.roomPublish('tbl_handfinished');
};

// TODO: Don't pass the cards here?
Room.prototype.onTable_PlayerExposeCards = function(seatIdx, cards) {
  this.roomPublish('tbl_exposehand', {
    seatIdx: seatIdx,
    cards: cards
  });
};

Room.prototype.onTable_PlayerFolded = function(seatIdx) {
  this.roomPublish('tbl_playerfolded', {
    seatIdx: seatIdx
  });
};

Room.prototype.onTable_PlayerChecked = function(seatIdx) {
  this.roomPublish('tbl_playerchecked', {
    seatIdx: seatIdx
  });
};

Room.prototype.onTable_PlayerCalled = function(seatIdx) {
  this.roomPublish('tbl_playercalled', {
    seatIdx: seatIdx
  });
};

Room.prototype.onTable_PlayerBet = function(seatIdx) {
  this.roomPublish('tbl_playerbet', {
    seatIdx: seatIdx
  });
};

Room.prototype.onTable_PlayerRaised = function(seatIdx) {
  this.roomPublish('tbl_playerraised', {
    seatIdx: seatIdx
  });
};

module.exports = Room;
