function OptionsUiController() {
  this.chipType = 1;
  this.canBet = false;
  this.canRaise = false;
  this.canCheck = false;
  this.canCall = false;
  this.betAmount = 0;
  this.betMin = 0;
  this.betMax = 0;
  this.betPot = 0;
  this.callAmount = 0;

  var self = this;
  $(document).ready(function() {
    self.el = $('#optionsPanel');

    self.el.find('#btnOptFold').click(function() {
      self.el.trigger('foldClicked');
    });
    self.el.find('#btnOptCall').click(function() {
      if (self.canCheck) {
        self.el.trigger('checkClicked');
      } else if (self.canCall) {
        self.el.trigger('callClicked');
      }
    });
    self.el.find('#btnOptBet').click(function() {
      if (self.canBet) {
        self.el.trigger('betClicked');
      } else if (self.canRaise) {
        self.el.trigger('raiseClicked');
      }
    });


    self.el.find('#betSliderMin').click(function() {
      self.setBetAmount(self.betMin);
    });
    self.el.find('#betSlider12').click(function() {
      self.setBetAmount(self.betPot * 0.5);
    });
    self.el.find('#betSlider34').click(function() {
      self.setBetAmount(self.betPot * 0.75);
    });
    self.el.find('#betSliderPot').click(function() {
      self.setBetAmount(self.betPot);
    });
    self.el.find('#betSliderMax').click(function() {
      self.setBetAmount(self.betMax);
    });

    var sliderEl = self.el.find('#betSliderPos');
    var isDraggingSlider = false;
    var dragOffsetX = 0;
    sliderEl.mousedown(function(e) {
      isDraggingSlider = true;
      dragOffsetX = sliderEl.position().left - e.pageX;
    });
    $(document).mousemove(function(e) {
      if (!isDraggingSlider) return;
      var newPos = e.pageX+dragOffsetX;
      var perc = (newPos-49)/(364-49);
      var betVal = Math.round((self.betMax-self.betMin) * perc + self.betMin);
      self.setBetAmount(betVal);
    });
    $(document).mouseup(function(e) {
      isDraggingSlider = false;
    });
  });
}

OptionsUiController.prototype.setBetAmount = function(val) {
  val = Math.round(val);
  if (val < this.betMin) {
    val = this.betMin;
  } else if (val > this.betMax) {
    val = this.betMax;
  }

  this.betAmount = val;
  this._updateButtons();

  var sliderEl = this.el.find('#betSliderPos');

  var sliderPos = Math.round(((val-this.betMin)/(this.betMax-this.betMin)*(364-49)) + 49);
  sliderEl.css('left', sliderPos+'px');

  var valStr = Utils.fmtChipAmt(val);
  this.el.find('#betSliderVal').val(valStr);
};

OptionsUiController.prototype.on = function(event, handler) {
  this.el.on(event, handler);
};
OptionsUiController.prototype.off = function(event, handler) {
  this.el.off(event, handler);
};

OptionsUiController.prototype.show = function() {
  this.el.show();
};

OptionsUiController.prototype.hide = function() {
  this.el.hide();
};

OptionsUiController.prototype.setCanFold = function(val) {
  if (val) {
    this.el.find('#btnOptFold').show();
  } else {
    this.el.find('#btnOptFold').hide();
  }
};
OptionsUiController.prototype.setCanCheck = function(val) {
  this.canCheck = val;
  this._updateButtons();
};
OptionsUiController.prototype.setCanCall = function(val, amount) {
  this.callAmount = amount;
  this.canCall = val;
  this._updateButtons();
};
OptionsUiController.prototype.setCanBet = function(val) {
  this.canBet = val;
  this._updateButtons();
};
OptionsUiController.prototype.setCanRaise = function(val) {
  this.canRaise = val;
  this._updateButtons();
};

OptionsUiController.prototype._updateButtons = function() {
  if (this.canCheck || this.canCall) {
    var amtStr = Utils.fmtChipAmt(this.callAmount);
    if (this.canCheck) {
      this.el.find('#btnOptCall').text('Check');
    } else if (this.canCall) {
      this.el.find('#btnOptCall').text('Call ' + amtStr);
    }
    this.el.find('#btnOptCall').show();
  } else {
    this.el.find('#btnOptCall').hide();
  }

  if (this.canRaise || this.canBet) {
    var amtStr = Utils.fmtChipAmt(this.betAmount);
    if (this.canBet) {
      this.el.find('#btnOptBet').text('Bet ' + amtStr);
    } else if (this.canRaise) {
      this.el.find('#btnOptBet').text('Raise ' + amtStr);
    }
    this.el.find('#btnOptBet').show();
  } else {
    this.el.find('#btnOptBet').hide();
  }
}

OptionsUiController.prototype.setBetRange = function(min, max, pot) {
  this.betMin = min;
  this.betMax = max;
  this.betPot = pot;
  this.setBetAmount(min);

  if (this.betMin !== this.betMax) {
    this.el.find('#betSlider').show();
  } else {
    this.el.find('#betSlider').hide();
  }
};

var optionsUi = new OptionsUiController();
