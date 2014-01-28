function CardUiController() {
  this.el = $('<div />');
  $('#playerCards').append(this.el);
}

CardUiController.prototype.remove = function() {
  this.el.remove();
};

CardUiController.prototype.setCard = function(cardIdx) {
  this.el.removeClass('cardBack cardFlip card');

  if (cardIdx >= 0) {
    this.el.addClass('card');
  } else {
    this.el.addClass('cardBack');
  }

  var offX = (cardIdx % 13) * 50;
  var offY = Math.floor(cardIdx / 13) * 70;
  this.el.css('background-position', -offX + 'px' + ' ' + -offY + 'px')
};

CardUiController.prototype.flipCard = function(cardIdx) {
  this.el.removeClass('cardBack cardFlip card');

  this.el.addClass('cardFlip');

  var frameIdx = 0;
  var self = this;
  var frameTick = setInterval(function() {
    frameIdx++;
    if (frameIdx >= 7) {
      self.setCard(cardIdx);
      clearInterval(frameTick);
      return;
    }

    self.el.css('background-position', (-50*frameIdx) + 'px 0px');
  }, 50);
};

CardUiController.prototype.setPosition = function(x, y) {
  this.el.css('left', x + 'px');
  this.el.css('top', y + 'px');
};

CardUiController.prototype.moveTo = function(x, y, duration, complete) {
  this.el.animate({
    left: x + 'px',
    top: y + 'px'
  }, duration, complete);
};
