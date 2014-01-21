var Uuid = require('node-uuid');
var Logger = require('./logger');
var poker = require('./poker');

function Room(id, type, name, tableOpts) {
  this.id = id;
  this.uuid = Uuid.v4();
  this.name = name;
  this.type = type;
  this.tableOpts = tableOpts;

  this.table = new poker.Table(this.uuid, tableOpts);
  this.users = [];

  this.on_table('player_sat', this.onTable_PlayerSat);
  this.on_table('player_stood', this.onTable_PlayerStood);
  this.on_table('player_satin', this.onTable_PlayerSatIn);
  this.on_table('player_satout', this.onTable_PlayerSatOut);
  this.on_table('player_to_pot', this.onTable_PlayerToPot);
  this.on_table('pot_to_player', this.onTable_PotToPlayer);
  this.on_table('dealt_flop', this.onTable_DealtFlop);
  this.on_table('dealt_turn', this.onTable_DealtTurn);
  this.on_table('dealt_river', this.onTable_DealtRiver);
  this.on_table('dealt_hands', this.onTable_DealtHands);
  this.on_table('player_balance_changed', this.onTable_PlayerBalanceChanged);
  this.on_table('player_bet_changed', this.onTable_PlayerBetChanged);
  this.on_table('dealer_moved', this.onTable_DealerMoved);
  this.on_table('action_moved', this.onTable_ActionMoved);
  this.on_table('pot_raked', this.onTable_PotRaked);
  this.on_table('hand_finished', this.onTable_HandFinished);
  this.on_table('player_show_hand', this.onTable_PlayerExposeCards);
  this.on_table('player_folded', this.onTable_PlayerFolded);
  this.on_table('player_checked', this.onTable_PlayerChecked);
  this.on_table('player_called', this.onTable_PlayerCalled);
  this.on_table('player_bet', this.onTable_PlayerBet);
  this.on_table('player_raised', this.onTable_PlayerRaised);
}

Room.prototype.on_table = function(evt, handler) {
  this.table.on(evt, function() {
    handler.apply(this, arguments);
  }.bind(this));
};

Room.prototype._users = function(handler) {
  for (var i = 0; i < this.users.length; ++i) {
    handler.call(this, this.users[i]);
  }
};

Room.prototype.addUser = function(user) {
  var userIdx = this.users.indexOf(user);
  var roomIdx = user.rooms.indexOf(this);

  if (userIdx !== -1 && roomIdx !== -1) {
    Logger.warn('attempted to add user who is already in room');
    Logger.trace();
    return;
  }
  if (userIdx === -1 && roomIdx !== -1) {
    Logger.warn('attempted to add user who is partially in room : 1');
  }
  if (userIdx !== -1 && roomIdx === -1) {
    Logger.warn('attempted to add user who is partially in room : 2');
  }

  if (userIdx === -1) {
    this.users.push(user);
  }
  if (roomIdx === -1) {
    user.rooms.push(this);
  }
};

Room.prototype.removeUser = function(user) {
  var userIdx = this.users.indexOf(user);
  var roomIdx = user.rooms.indexOf(this);

  if (userIdx === -1 && roomIdx !== -1) {
    Logger.warn('attempted to remove user who is not at table');
    Logger.trace();
    return;
  }
  if (userIdx === -1 && roomIdx !== -1) {
    Logger.warn('attempted to remove user who is partially in room : 1');
  }
  if (userIdx !== -1 && roomIdx === -1) {
    Logger.warn('attempted to remove user who is partially in room : 2');
  }

  if (userIdx !== -1) {
    this.users.splice(userIdx, 1);
  }
  if (roomIdx !== -1) {
    user.rooms.splice(roomIdx, 1);
  }
};

Room.prototype.currentBlinds = function() {
  return this.table.blinds;
};

Room.prototype.seatCount = function() {
  return this.table.seats.length;
};

Room.prototype.usersSeated = function() {
  return this.table.seatedCount();
};

Room.prototype.usersSeatIdx = function(user) {
  return this.table.getPosFromUuid(user.uuid);
};

Room.prototype.userIsSeated = function(user) {
  return this.usersSeatIdx(user) >= 0;
};

Room.prototype.onUserConnect = function(user) {
  var tableState = this.table.info(user.uuid);
  user.nemit('game_openroom', {
    id: this.id,
    name: this.name,
    state: tableState
  });
};

Room.prototype.onUserDisconnect = function(user) {
};




Room.prototype.onTable_PlayerSat = function(seatIdx) {
  this._users(function(user) {
    user.nemit('tbl_playersat', {
      roomId: this.id,
      seatIdx: seatIdx,
      state: this.table.playerInfo(user.uuid, seatIdx)
    });
  });
};

Room.prototype.onTable_PlayerStood = function(seatIdx) {
  this._users(function(user) {
    user.nemit('tbl_playerstood', {
      roomId: this.id,
      seatIdx: seatIdx
    });
  });
};

Room.prototype.onTable_PlayerSatIn = function(seatIdx) {
  this._users(function(user) {
    user.nemit('tbl_playersatin', {
      roomId: this.id,
      seatIdx: seatIdx
    });
  });
};

Room.prototype.onTable_PlayerSatOut = function(seatIdx) {
  this._users(function(user) {
    user.nemit('tbl_playersatout', {
      roomId: this.id,
      seatIdx: seatIdx
    });
  });
};

Room.prototype.onTable_PlayerToPot = function(seatIdx, potIdx, amount) {
  this._users(function(user) {
    user.nemit('tbl_playerbettopot', {
      roomId: this.id,
      seatIdx: seatIdx,
      potIdx: potIdx,
      amount: amount
    });
  });
};

Room.prototype.onTable_PotToPlayer = function(potIdx, seatIdx, amount) {
  this._users(function(user) {
    user.nemit('tbl_pottoplayer', {
      roomId: this.id,
      potIdx: potIdx,
      seatIdx: seatIdx,
      amount: amount
    });
  });
};

Room.prototype.onTable_DealtFlop = function() {
  this._users(function(user) {
    user.nemit('tbl_dealtcommunity', {
      roomId: this.id,
      cards: [
        this.table.communityCards[0],
        this.table.communityCards[1],
        this.table.communityCards[2]
      ]
    });
  });
};

Room.prototype.onTable_DealtTurn = function() {
  this._users(function(user) {
    user.nemit('tbl_dealtcommunity', {
      roomId: this.id,
      cards: [
        this.table.communityCards[3]
      ]
    });
  });
};

Room.prototype.onTable_DealtRiver = function() {
  this._users(function(user) {
    user.nemit('tbl_dealtcommunity', {
      roomId: this.id,
      cards: [
        this.table.communityCards[4]
      ]
    });
  });
};

Room.prototype.onTable_DealtHands = function() {
  this._users(function(user) {
    var mySeatIdx = this.table.getPosFromUuid(user.uuid);

    var hands = [];
    for (var i = 0; i < this.table.seats.length; ++i) {
      var seat = this.table.seats[i];
      var cards = null;
      if (seat) {
        cards = [];
        for (var j = 0; j < seat.holeCards.length; ++j) {
          if (i === mySeatIdx) {
            cards.push(seat.holeCards[j]);
          } else {
            cards.push(-1);
          }
        }
      }
      hands.push(cards);
    }
    user.nemit('tbl_dealthands', {
      roomId: this.id,
      hands: hands
    });
  });
};

Room.prototype.onTable_PlayerBalanceChanged = function(seatIdx, balance) {
  this._users(function(user) {
    user.nemit('tbl_playerbalancechanged', {
      roomId: this.id,
      seatIdx: seatIdx,
      balance: balance
    });
  });
};

Room.prototype.onTable_PlayerBetChanged = function(seatIdx, bet) {
  this._users(function(user) {
    user.nemit('tbl_playerbetchanged', {
      roomId: this.id,
      seatIdx: seatIdx,
      bet: bet
    });
  });
};

Room.prototype.onTable_DealerMoved = function(seatIdx) {
  this._users(function(user) {
    user.nemit('tbl_dealermoved', {
      roomId: this.id,
      seatIdx: seatIdx
    });
  });
};

Room.prototype.onTable_ActionMoved = function(seatIdx, timer) {
  this._users(function(user) {
    var myPos = this.table.getPosFromUuid(user.uuid);
    var myOptions = null;
    if (myPos !== -1) {
      myOptions = this.table.actionOpts(myPos);
    }

    user.nemit('tbl_actionmoved', {
      roomId: this.id,
      seatIdx: seatIdx,
      myOptions: myOptions,
      timer: timer
    });
  });
};

Room.prototype.onTable_PotRaked = function(potIdx, amount) {
  this._users(function(user) {
    user.nemit('tbl_potraked', {
      roomId: this.id,
      potIdx: potIdx,
      amount: amount
    });
  });
};

Room.prototype.onTable_HandFinished = function() {
  this._users(function(user) {
    user.nemit('tbl_handfinished', {
      roomId: this.id
    });
  });
};

// TODO: Don't pass the cards here?
Room.prototype.onTable_PlayerExposeCards = function(seatIdx, cards) {
  this._users(function(user) {
    user.nemit('tbl_exposehand', {
      roomId: this.id,
      seatIdx: seatIdx,
      cards: cards
    });
  });
};

Room.prototype.onTable_PlayerFolded = function(seatIdx) {
  this._users(function(user) {
    user.nemit('tbl_playerfolded', {
      roomId: this.id,
      seatIdx: seatIdx
    });
  });
};

Room.prototype.onTable_PlayerChecked = function(seatIdx) {
  this._users(function(user) {
    user.nemit('tbl_playerchecked', {
      roomId: this.id,
      seatIdx: seatIdx
    });
  });
};

Room.prototype.onTable_PlayerCalled = function(seatIdx) {
  this._users(function(user) {
    user.nemit('tbl_playercalled', {
      roomId: this.id,
      seatIdx: seatIdx
    });
  });
};

Room.prototype.onTable_PlayerBet = function(seatIdx) {
  this._users(function(user) {
    user.nemit('tbl_playerbet', {
      roomId: this.id,
      seatIdx: seatIdx
    });
  });
};

Room.prototype.onTable_PlayerRaised = function(seatIdx) {
  this._users(function(user) {
    user.nemit('tbl_playerraised', {
      roomId: this.id,
      seatIdx: seatIdx
    });
  });
};

module.exports = Room;
