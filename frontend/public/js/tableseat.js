function TableSeat(table, seatIdx, seatCount) {
  this.table = table;
  this.seatIdx = seatIdx;
  this.holeCards = [];
  this.balance = 0;
  this.betAmount = 0;

  //this.ui = new PlayerUiController(seatIdx, seatCount);
  //$('.playerPanels').append(this.ui.el);

  this.ui.setCanSitHere(true);
  this.ui.setHasPlayer(false);

  this.ui.on('trySit', function() {
    trySitDownAt(seatIdx);
  });
}

TableSeat.prototype.setInfo = function(info) {
  if (!info) {
    this.ui.setHasPlayer(false);
    this.setHoleCards([]);
    return;
  }

  this.ui.setName(info.name);
  this.ui.setBalance(1, info.balance);
  this.ui.setSittingOut(info.sittingOut);
  this.ui.setHasPlayer(true);

  this.setBet(info.handBet);
  this.setHoleCards(info.hand);
};

TableSeat.prototype.setTimer = function(remain, total) {
  this.ui.setTimer(remain, total);
};

TableSeat.prototype.setBet = function(amount) {
  this.betAmount = amount;
  stackMgr.setSeatBet(this.seatIdx, amount);
};

TableSeat.prototype.setSittingOut = function(val) {
  this.ui.setSittingOut(val);
}

TableSeat.prototype.setCanSitHere = function(val) {
  this.ui.setCanSitHere(val);
}

TableSeat.prototype.setIsTheAction = function(val) {
  this.ui.setIsTheAction(val);
};

// TODO: Remove `type` here
TableSeat.prototype.setBalance = function(balance) {
  this.balance = balance;
  this.ui.setBalance(1, this.balance);
};

TableSeat.prototype.addBalance = function(balance) {
  this.balance += balance
  this.ui.setBalance(1, this.balance);
};

TableSeat.prototype.dealHoleCard = function(cardNum, cardIdx) {
  var cardPos = this.ui.cardPosition(cardNum, this.seatIdx === mySeatIdx);

  var card = new CardUiController();
  card.setCard(-1);
  card.setPosition((960/2)-(50/2), (540/2)-(70/2));
  card.moveTo(cardPos.x, cardPos.y, 400, function() {
    card.setCard(cardIdx);
  });
  this.holeCards.push(card);
};

TableSeat.prototype.setHoleCards = function(cards) {
  for (var i = 0; i < this.holeCards.length; ++i) {
    this.holeCards[i].remove();
  }
  this.holeCards = [];

  for (var i = 0; i < cards.length; ++i) {
    var cardPos = this.ui.cardPosition(i, this.seatIdx === mySeatIdx);

    var card = new CardUiController();
    card.setCard(cards[i]);
    card.setPosition(cardPos.x, cardPos.y);
    this.holeCards.push(card);
  }
};