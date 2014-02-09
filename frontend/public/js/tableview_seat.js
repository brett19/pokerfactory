var SEAT_POSITION = [
  null, null,
  [],
  [],
  [[380, 30], [746, 241], [380, 445], [12, 241]],
  [],
  [],
  [],
  [],
  [],
  [[546, 30], [711, 119], [746, 241], [710, 359], [546, 445], [214, 445], [56, 359], [12, 241], [56, 118], [214, 30]]
];

function TableViewSeat(table, seatIdx) {
  this.table = table;
  this.seatIdx = seatIdx;
  this.holeCards = [];

  this.el = $('<div />');
  this.el.addClass('player');

  var seatCount = this.table.seatCount;

  if (seatIdx / seatCount >= 0.5) {
    this.pos = +1;
    this.el.addClass('playerRight');
  } else {
    this.pos = -1;
    this.el.addClass('playerLeft');
  }

  var uiHtml = '';
  uiHtml += '<div class="playerSeated">'
  uiHtml += '<div class="playerName"></div>';
  uiHtml += '<div class="playerBalance"></div>';
  uiHtml += '<div class="playerIcon"></div>';
  uiHtml += '<div class="playerTimer">';
  uiHtml += '<div class="playerTimerVal"></div>';
  uiHtml += '</div>';
  uiHtml += '<div class="playerSitOut">';
  uiHtml += '<div class="playerSitOutMask"></div>';
  uiHtml += '<div class="playerSitOutText">SITTING OUT</div>';
  uiHtml += '</div>';
  uiHtml += '</div>';
  uiHtml += '<div class="seatEmpty">'
  uiHtml += 'SIT HERE'
  uiHtml += '</div>';
  this.el.append(uiHtml);

  this.position = {
    x: SEAT_POSITION[seatCount][seatIdx][0],
    y: SEAT_POSITION[seatCount][seatIdx][1]
  };

  this.el.css('left', this.position.x + 'px');
  this.el.css('top', this.position.y + 'px');
  this.el.appendTo(this.table.el.find('.playerPanels'));

  var self = this;
  this.el.find('.seatEmpty').on('click', function() {
    self.el.trigger('trySit');
  });

  this.setName('Invalid');
  this.setBalance(0);
  this.setSittingOut(false);
  this.setCanSitHere(true);
}

TableViewSeat.prototype.on = function(event, handler) {
  this.el.on(event, handler);
};
TableViewSeat.prototype.off = function(event, handler) {
  this.el.off(event, handler);
};

TableViewSeat.prototype.setTimer = function(remain, total) {
  if (this.timerSound) {
    this.timerSound.stop();
    this.timerSound = null;
  }
  if (this.timerTick) {
    clearInterval(this.timerTick);
    this.timerTick = null;
  }

  if (total <= 0) {
    this.el.find('.playerTimer').hide();
    return 0;
  }

  var curPerc = remain / total * 100;
  var endTime = Date.now() + remain;
  this.el.find('.playerTimerVal').css('width', curPerc + '%');
  this.el.find('.playerTimer').show();

  var self = this;
  this.timerTick = setInterval(function() {
    var diffTime = endTime - Date.now();
    var newPerc = diffTime / total * 100;
    self.el.find('.playerTimerVal').css('width', newPerc + '%');

    // TODO: Restore the tick sound here
    /* mySeatIdx doesn't exist here
    if (diffTime < 7000 && !self.timerSound) {
      if (self.seatIdx === mySeatIdx) {
        createjs.Sound.play('timer_warning');
        self.timerSound = createjs.Sound.play('timer_10_sec');
      }
    }
    */
  }, 50);
};

TableViewSeat.prototype.setName = function(name) {
  this.el.find('.playerName').text(name);
};

TableViewSeat.prototype.setBalance = function(amount) {
  this.el.find('.playerBalance').text(Utils.fmtChipAmt(amount));
};

TableViewSeat.prototype.setSittingOut = function(val) {
  if (val) {
    this.el.find('.playerSitOut').show();
  } else {
    this.el.find('.playerSitOut').hide();
  }
};

TableViewSeat.prototype._updateSitState = function() {
  if (this.hasPlayer) {
    this.el.find('.playerSeated').show();
    this.el.find('.seatEmpty').hide();
  } else {
    if (this.canSitHere) {
      this.el.find('.playerSeated').hide();
      this.el.find('.seatEmpty').show();
    } else {
      this.el.find('.playerSeated').hide();
      this.el.find('.seatEmpty').hide();
    }
  }
}

TableViewSeat.prototype.setCanSitHere = function(val) {
  this.canSitHere = val;
  this._updateSitState();
};

TableViewSeat.prototype.setIsTheAction = function(val) {
  if (val) {
    this.el.css('background-color', '#aeff72');
  } else {
    this.el.css('background-color', '#ffffff');
  }
};

TableViewSeat.prototype.setHasPlayer = function(val) {
  this.hasPlayer = val;
  this._updateSitState();
};

TableViewSeat.prototype.cardPosition = function(cardNum, isMyself) {
  var cardDist = 18;

  if (isMyself) {
    cardDist = 54;
  }

  if (this.pos === -1) {
    return {
      x: this.position.x + 30 + cardDist * cardNum,
      y: this.position.y - 40
    }
  } else if (this.pos === +1) {
    return {
      x: this.position.x + 70 + cardDist * cardNum,
      y: this.position.y - 40
    }
  }
};

TableViewSeat.prototype.isSelf = function() {
  return this.seatIdx === this.table.ctrl.mySeatIdx;
};

TableViewSeat.prototype.dealHoleCard = function(cardNum, cardIdx) {
  var cardPos = this.cardPosition(cardNum, this.isSelf());

  var card = new TableView_Card(this.table);
  card.setCard(-1);
  card.setPosition((960/2)-(50/2), (540/2)-(70/2));
  card.moveTo(cardPos.x, cardPos.y, 400, function() {
    card.setCard(cardIdx);
  });
  this.holeCards.push(card);
};

TableViewSeat.prototype.setHoleCards = function(cards) {
  for (var i = 0; i < this.holeCards.length; ++i) {
    this.holeCards[i].remove();
  }
  this.holeCards = [];

  for (var i = 0; i < cards.length; ++i) {
    var cardPos = this.cardPosition(i, this.isSelf());

    var card = new TableView_Card(this.table);
    card.setCard(cards[i]);
    card.setPosition(cardPos.x, cardPos.y);
    this.holeCards.push(card);
  }
};
