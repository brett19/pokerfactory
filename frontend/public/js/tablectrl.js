function TableController(id, name, state) {
  this.id = id;
  this.name = name;
  this.seatCount = 10;
  this.mySeatIdx = -1;
  this.eventList = [];

  this.seats = [];
  for (var i = 0; i < state.seats.length; ++i) {
    var seat = new TableControllerSeat(this, i);
    this.seats.push(seat);

    if (state.seats[i] && state.seats[i].myself) {
      this.mySeatIdx = i;
    }
  }

  this.ui = new TableView(this);

  for (var i = 0;i < this.seats.length; ++i) {
    this.ui.setSeatInfo(i, state.seats[i]);
  }
  this.ui.setPots(state.pots);
  this.ui.setCommCards(state.communityCards);
  this.ui.setCanSit(this.mySeatIdx === -1);
  this.ui.moveAction(
    state.actionPos,
    state.actionTimer,
    state.actionTimerLen,
    state.actionPos === this.mySeatIdx
  );

  this.ui.on('actSitDown', this.actSitDown.bind(this));
  this.ui.on('actStandUp', this.actStandUp.bind(this));
  this.ui.on('actSitIn', this.actSitIn.bind(this));
  this.ui.on('actSitOut', this.actSitOut.bind(this));

  this.ui.on('actFold', this.actFold.bind(this));
  this.ui.on('actCheck', this.actCheck.bind(this));
  this.ui.on('actCall', this.actCall.bind(this));
  this.ui.on('actBet', this.actBet.bind(this));
  this.ui.on('actRaise', this.actRaise.bind(this));

  this.ui.on('sendChat', this.sendChat.bind(this));

  this.non('tbl_playersat', this.nonTable_PlayerSat);
  this.non('tbl_playerstood', this.nonTable_PlayerStood);
  this.non('tbl_playersatin', this.nonTable_PlayerSatIn);
  this.non('tbl_playersatout', this.nonTable_PlayerSatOut);
  this.non('tbl_playerbalancechanged', this.nonTable_PlayerBalanceChanged);
  this.non('tbl_playerbetchanged', this.nonTable_PlayerBetChanged);
  this.non('tbl_playerbettopot', this.nonTable_PlayerBetToPot);
  this.non('tbl_pottoplayer', this.nonTable_PotToPlayer);
  this.non('tbl_dealthands', this.nonTable_DealtHands);
  this.non('tbl_dealtcommunity', this.nonTable_DealtCommunity);
  this.non('tbl_dealermoved', this.nonTable_DealerMoved);
  this.non('tbl_actionmoved', this.nonTable_ActionMoved);
  this.non('tbl_options', this.nonTable_MyOptions);
  this.non('tbl_playerfolded', this.nonTable_PlayerFolded);
  this.non('tbl_playerchecked', this.nonTable_PlayerChecked);
  this.non('tbl_playercalled', this.nonTable_PlayerCalled);
  this.non('tbl_playerbet', this.nonTable_PlayerBet);
  this.non('tbl_playerraised', this.nonTable_PlayerRaised);
  this.non('tbl_exposehand', this.nonTable_ExposeHand);
  this.non('tbl_potraked', this.nonTable_PotRaked);
  this.non('tbl_handstarted', this.nonTable_HandStarted);
  this.non('tbl_handfinished', this.nonTable_HandFinished);
  this.non('tbl_chat', this.nonTable_Chat);
}

TableController.prototype.destroy = function() {
  for (var i = 0; i < this.eventList.length; ++i) {
    connManager.noff(this.eventList[i][0], this.eventList[i][1]);
  }
};

TableController.prototype.non = function(event, handler) {
  var wrapper = function(err, data) {
    if (data && data.roomId === this.id) {
      handler.call(this, err, data);
    }
  }.bind(this);
  this.eventList.push([event, wrapper]);
  connManager.non(event, wrapper);
};

TableController.prototype.nemit = function(event, data) {
  if (!data) data = {};
  data.roomId = this.id;
  connManager.nemit(event, data);
};

TableController.prototype.actSitDown = function(seatIdx) {
  this.nemit('room_sitdown', {
    seatIdx: seatIdx,
    buyIn: 5000
  })
};

TableController.prototype.actStandUp = function() {
  this.nemit('tbl_standup')
};

TableController.prototype.actSitIn = function() {
  this.nemit('tbl_sitin')
};

TableController.prototype.actSitOut = function() {
  this.nemit('tbl_sitout')
};


TableController.prototype.actFold = function() {
  this.nemit('tbl_fold');
};
TableController.prototype.actCheck = function() {
  this.nemit('tbl_check');
};
TableController.prototype.actCall = function(amount) {
  this.nemit('tbl_call');
};
TableController.prototype.actBet = function(amount) {
  this.nemit('tbl_bet', {
    amount: amount
  });
};
TableController.prototype.actRaise = function(amount) {
  this.nemit('tbl_raise', {
    amount: amount
  });
};

TableController.prototype.sendChat = function(text) {
  this.nemit('tbl_chat', {
    msg: text
  });
};

TableController.prototype.nonTable_PlayerSat = function(err, data) {
  if (data.state.myself) {
    this.mySeatIdx = data.seatIdx;
    this.ui.setCanSit(false);
  }

  this.ui.setSeatInfo(data.seatIdx, data.state);
};

TableController.prototype.nonTable_PlayerStood = function(err, data) {
  if (data.seatIdx === this.mySeatIdx) {
    this.mySeatIdx = -1;
    this.ui.setCanSit(true);
  }

  this.ui.setSeatInfo(data.seatIdx, null);
};

TableController.prototype.nonTable_PlayerSatOut = function(err, data) {
  this.ui.setSeatSittingOut(data.seatIdx, true);
};

TableController.prototype.nonTable_PlayerSatIn = function(err, data) {
  this.ui.setSeatSittingOut(data.seatIdx, false);
};

TableController.prototype.nonTable_PlayerBalanceChanged = function(err, data) {
  this.ui.setSeatBalance(data.seatIdx, data.balance);
};

TableController.prototype.nonTable_PlayerBetChanged = function(err, data) {
  this.ui.setSeatBet(data.seatIdx, data.bet);
};

TableController.prototype.nonTable_PlayerBetToPot = function(err, data) {
  this.ui.moveBetToPot(data.seatIdx, data.potIdx, data.amount);
};

TableController.prototype.nonTable_PotToPlayer = function(err, data) {
  this.ui.movePotToSeat(data.potIdx, data.seatIdx, data.amount);
};

TableController.prototype.nonTable_DealtHands = function(err, data) {
  this.ui.dealHands(data.hands);
};

TableController.prototype.nonTable_DealtCommunity = function(err, data) {
  this.ui.dealCommCards(data.cards)
};

TableController.prototype.nonTable_DealerMoved = function(err, data) {
  this.ui.moveDealer(data.seatIdx);
};

TableController.prototype.nonTable_ActionMoved = function(err, data) {
  var isMe = data.seatIdx === this.mySeatIdx;
  this.ui.moveAction(data.seatIdx, data.timer, data.timer, isMe);
};

TableController.prototype.nonTable_MyOptions = function(err, data) {
  this.ui.setOptions(data);
};

TableController.prototype.nonTable_PlayerFolded = function(err, data) {
  this.ui.playerFolded(data.seatIdx);
};

TableController.prototype.nonTable_PlayerChecked = function(err, data) {
  this.ui.playerChecked(data.seatIdx);
};

TableController.prototype.nonTable_PlayerCalled = function(err, data) {
  this.ui.playerCalled(data.seatIdx);
};

TableController.prototype.nonTable_PlayerBet = function(err, data) {
  this.ui.playerBet(data.seatIdx); // No amount sent
};

TableController.prototype.nonTable_PlayerRaised = function(err, data) {
  this.ui.playerRaised(data.seatIdx); // No amount sent
};

TableController.prototype.nonTable_ExposeHand = function(err, data) {
  this.ui.showHoleCards(data.seatIdx, data.cards);
};

TableController.prototype.nonTable_PotRaked = function(err, data) {
  this.ui.rakePot(data.potIdx, data.amount);
};

TableController.prototype.nonTable_HandStarted = function(err, data) {
  this.ui.handStarted();
};

TableController.prototype.nonTable_HandFinished = function(err, data) {
  this.ui.handFinished();
};

TableController.prototype.nonTable_Chat = function(err, data) {
  this.ui.addChatMsg(data.sender, data.msg);
};
