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

function PlayerUiController(seatIdx, seatCount) {
  this.canSitHere = false;
  this.hasPlayer = false;

  this.seatIdx = seatIdx;

  this.el = $('<div />');
  this.el.addClass('player');

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

  var self = this;
  this.el.find('.seatEmpty').on('click', function() {
    self.el.trigger('trySit');
  });

  this.timerTick = null;
  this.timerSound = null;
  this.setTimer(0, 0);
}

PlayerUiController.prototype.on = function(event, handler) {
  this.el.on(event, handler);
};
PlayerUiController.prototype.off = function(event, handler) {
  this.el.off(event, handler);
};

PlayerUiController.prototype.setTimer = function(remain, total) {
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

    if (diffTime < 7000 && !self.timerSound) {
      if (self.seatIdx === mySeatIdx) {
        createjs.Sound.play('timer_warning');
        self.timerSound = createjs.Sound.play('timer_10_sec');
      }
    }
  }, 50);
};

PlayerUiController.prototype.setName = function(name) {
  this.el.find('.playerName').text(name);
};

PlayerUiController.prototype.setBalance = function(type, amount) {
  this.el.find('.playerBalance').text(Utils.fmtChipAmt(amount));
};

PlayerUiController.prototype.setSittingOut = function(val) {
  if (val) {
    this.el.find('.playerSitOut').show();
  } else {
    this.el.find('.playerSitOut').hide();
  }
};

PlayerUiController.prototype._updateSitState = function() {
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

PlayerUiController.prototype.setCanSitHere = function(val) {
  this.canSitHere = val;
  this._updateSitState();
};

PlayerUiController.prototype.setIsTheAction = function(val) {
  if (val) {
    this.el.css('background-color', '#aeff72');
  } else {
    this.el.css('background-color', '#ffffff');
  }
};

PlayerUiController.prototype.setHasPlayer = function(val) {
  this.hasPlayer = val;
  this._updateSitState();
};

PlayerUiController.prototype.cardPosition = function(cardNum, isMyself) {
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
