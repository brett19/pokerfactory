function TableView(ctrl) {
  this.ctrl = ctrl;
  this.seatCount = this.ctrl.seats.length;

  this.el = $('#tableTemplate').clone();
  this.el.attr('id', null);
  this.el.removeClass('template');
  this.el.appendTo('#tabContent');

  this.seats = [];
  var self = this;
  for (var i = 0; i < this.seatCount; ++i) {
    (function(seatIdx) {
      var seat = new TableViewSeat(self, seatIdx);
      self.seats.push(seat);

      seat.on('trySit', function() {
        self.emit('actSitDown', seatIdx);
      });
    })(i);
  }

  this.el.find('.actStand').on('click', function() {
    self.emit('actStandUp');
  });
  this.el.find('.actSitOut').on('click', function() {
    self.emit('actSitOut');
  });
  this.el.find('.actSitIn').on('click', function() {
    self.emit('actSitIn');
  });

  this.el.find('.chatSubmit').on('click', function() {
    var chatBox = self.el.find('.chatInput .chatBox');
    var chatText = chatBox.val();
    chatBox.val('');
    self.emit('sendChat', chatText);
  });
  this.el.find('.chatInput .chatBox').keyup(function(e){
    if(e.keyCode === 13){
      self.el.find('.chatSubmit').click();
    }
  });

  this.stacks = new TableView_Stacks(this);
  this.commCards = new TableView_CommCards(this);
  this.options = new TableView_Options(this);

  var tabId = gameView.registerTab(this.ctrl.name, this.el);
  gameView.setTab(tabId);
}
Utils.inherits(TableView, EventEmitter);

TableView.prototype.setCanSit = function(val) {
  for (var i = 0; i < this.seats.length; ++i) {
    this.seats[i].setCanSitHere(val);
  }
};

TableView.prototype.setCommCards = function(cards) {
  this.commCards.setCards(cards);
};

TableView.prototype.setPots = function(pots) {
  this.stacks.setPotAmounts(pots);
};

TableView.prototype.setSeatSittingOut = function(seatIdx, val) {
  this.seats[seatIdx].setSittingOut(val);
};

TableView.prototype.setSeatBalance = function(seatIdx, val) {
  this.seats[seatIdx].setBalance(val);
};

TableView.prototype.setSeatBet = function(seatIdx, val) {
  this.stacks.setSeatBet(seatIdx, val);
};

TableView.prototype.moveBetToPot = function(seatIdx, potIdx, val) {
  this.stacks.moveBetToPot(seatIdx, potIdx, val);
};

TableView.prototype.movePotToSeat = function(potIdx, seatIdx, val) {
  this.stacks.movePotToSeat(potIdx, seatIdx, val);
  this.seats[seatIdx].addBalance(val);
};

TableView.prototype.dealHands = function(hands) {
  var seats = this.seats;
  for (var i = 0; i < hands.length; ++i) {
    (function(seatIdx, hand) {
      if (!hand) {
        return;
      }

      for (var j = 0; j < hand.length; ++j) {
        (function(cardNum) {
          setTimeout(function() {
            seats[seatIdx].dealHoleCard(cardNum, hand[cardNum])
          }, j * 400);
        })(j);
      }
    })(i, hands[i]);
  }

  // TODO: Sounds
};

TableView.prototype.dealCommCards = function(hands) {
  this.commCards.dealCards(hands);
};

TableView.prototype.moveDealer = function(seatIdx) {
  // TODO: Dealer Chip Moving
};

TableView.prototype.moveAction = function(seatIdx, timerCur, timerLen, isMe) {
  for (var i = 0; i < this.seatCount; ++i) {
    var isTheAction = i === seatIdx;
    this.seats[i].setIsTheAction(isTheAction);
    if (isTheAction) {
      this.seats[i].setTimer(timerCur, timerLen);
    } else {
      this.seats[i].setTimer(0, 0);
    }
  }

  if (isMe) {
    this.options.show();
  } else {
    this.options.hide();
  }
};

TableView.prototype.setOptions = function(opts) {
  if (!opts) {
    return;
  }

  this.options.setBetRange(opts.bet_min, opts.bet_max, opts.bet_pot);
  this.options.setCanFold(opts.fold);
  this.options.setCanCheck(opts.check);
  this.options.setCanCall(opts.call, opts.call_cost);
  this.options.setCanBet(opts.bet);
  this.options.setCanRaise(opts.raise);
};

TableView.prototype.playerFolded = function(seatIdx) {
  this.seats[seatIdx].setHoleCards([]);
};

TableView.prototype.playerChecked = function(seatIdx) {
};

TableView.prototype.playerCalled = function(seatIdx) {
};

TableView.prototype.playerBet = function(seatIdx) {
};

TableView.prototype.playerRaised = function(seatIdx) {
};

TableView.prototype.showHoleCards = function(seatIdx, cards) {
  this.seats[seatIdx].setHoleCards(cards);
};

TableView.prototype.rakePot = function(potIdx, amount) {
  this.stacks.rakePot(potIdx, amount);
};

TableView.prototype.handStarted = function() {
  this.addChatMsg(null, ' - Hand Started');
};

TableView.prototype.handFinished = function() {
  this.commCards.setCards([]);
  for (var i = 0; i < this.seats.length; ++i) {
    this.seats[i].setHoleCards([]);
  }
};

TableView.prototype.setSeatInfo = function(seatIdx, info) {
  var ui = this.seats[seatIdx];

  if (!info) {
    ui.setHasPlayer(false);
    ui.setHoleCards([]);
    return;
  }

  ui.setName(info.name);
  ui.setBalance(info.balance);
  ui.setHoleCards(info.hand);
  ui.setSittingOut(info.sittingOut);
  ui.setHasPlayer(true);
  ui.setTimer(0, 0);

  this.stacks.setSeatBet(seatIdx, info.handBet);
};

TableView.prototype.addChatMsg = function(sender, msg) {
  var text = '';
  if (sender) {
    text += sender + ': ';
  }
  text += msg;

  var chatTextEl = this.el.find('.chatText');
  chatTextEl.append(text + '<br />');
  chatTextEl.scrollTop(chatTextEl[0].scrollHeight);
};
