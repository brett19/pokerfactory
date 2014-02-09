function TableView_Options(table) {
  this.table = table;
  this.betAmount = 0;
  this.betMin = 0;
  this.betMax = 0;
  this.betPot = 0;
  this.callAmount = 0;
  this.el = table.el.find('.optionsWindow');

  var self = this;

  self.el.find('.btnOptFold').click(function() {
    self.table.emit('actFold');
  });
  self.el.find('.btnOptCheck').click(function() {
    self.table.emit('actCheck');
  });
  self.el.find('.btnOptCall').click(function() {
    self.table.emit('actCall', self.callAmount);
  });
  self.el.find('.btnOptBet').click(function() {
    self.table.emit('actBet', self.betAmount);
  });
  self.el.find('.btnOptRaise').click(function() {
    self.table.emit('actRaise', self.betAmount);
  });

  self.el.find('.betSliderMin').click(function() {
    self.setBetAmount(self.betMin);
  });
  self.el.find('.betSlider12').click(function() {
    self.setBetAmount(self.betPot * 0.5);
  });
  self.el.find('.betSlider34').click(function() {
    self.setBetAmount(self.betPot * 0.75);
  });
  self.el.find('.betSliderPot').click(function() {
    self.setBetAmount(self.betPot);
  });
  self.el.find('.betSliderMax').click(function() {
    self.setBetAmount(self.betMax);
  });

  var sliderEl = this.el.find('.betSliderPos');
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
}

TableView_Options.prototype.setBetAmount = function(val) {
  val = Math.round(val);
  if (val < this.betMin) {
    val = this.betMin;
  } else if (val > this.betMax) {
    val = this.betMax;
  }

  this.betAmount = val;
  this._updateButtons();

  var sliderEl = this.el.find('.betSliderPos');

  var sliderPos = Math.round(((val-this.betMin)/(this.betMax-this.betMin)*(364-49)) + 49);
  sliderEl.css('left', sliderPos+'px');

  var valStr = Utils.fmtChipAmt(val);
  this.el.find('.betSliderVal').val(valStr);
};

TableView_Options.prototype.on = function(event, handler) {
  this.el.on(event, handler);
};
TableView_Options.prototype.off = function(event, handler) {
  this.el.off(event, handler);
};

TableView_Options.prototype.show = function() {
  this.el.find('.optionsPanel').show();
};

TableView_Options.prototype.hide = function() {
  this.el.find('.optionsPanel').hide();
};

TableView_Options.prototype.setCanFold = function(val) {
  if (val) {
    this.el.find('.btnOptFold').show();
  } else {
    this.el.find('.btnOptFold').hide();
  }
  this._updateButtons();
};
TableView_Options.prototype.setCanCheck = function(val) {
  if (val) {
    this.el.find('.btnOptCheck').show();
  } else {
    this.el.find('.btnOptCheck').hide();
  }
  this._updateButtons();
};
TableView_Options.prototype.setCanCall = function(val, amount) {
  this.callAmount = amount ? amount : 0;
  if (val) {
    this.el.find('.btnOptCall').show();
  } else {
    this.el.find('.btnOptCall').hide();
  }
  this._updateButtons();
};
TableView_Options.prototype.setCanBet = function(val) {
  if (val) {
    this.el.find('.btnOptBet').show();
  } else {
    this.el.find('.btnOptBet').hide();
  }
  this._updateButtons();
};
TableView_Options.prototype.setCanRaise = function(val) {
  if (val) {
    this.el.find('.btnOptRaise').show();
  } else {
    this.el.find('.btnOptRaise').hide();
  }
  this._updateButtons();
};

TableView_Options.prototype._updateButtons = function() {
  var callAmtStr = Utils.fmtChipAmt(this.callAmount);
  this.el.find('.btnOptCall').text('Call ' + callAmtStr);
  var betAmtStr = Utils.fmtChipAmt(this.betAmount);
  this.el.find('.btnOptBet').text('Bet ' + betAmtStr);
  this.el.find('.btnOptRaise').text('Raise ' + betAmtStr);
}

TableView_Options.prototype.setBetRange = function(min, max, pot) {
  this.betMin = min ? min : 0;
  this.betMax = max ? max : 0;
  this.betPot = pot ? pot : 0;
  this.setBetAmount(min);

  if (this.betMin !== this.betMax) {
    this.el.find('.betSlider').show();
  } else {
    this.el.find('.betSlider').hide();
  }
};
