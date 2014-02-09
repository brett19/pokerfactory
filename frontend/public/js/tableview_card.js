function TableView_Card(table) {
  this.el = $('<div class="card" />');
  this.el.appendTo(table.el.find('.playerCards'));
}

TableView_Card.prototype.remove = function() {
  this.el.remove();
};

TableView_Card.prototype.setCard = function(cardIdx) {
  this.el.removeClass('cardFront cardBack cardFlip');

  if (cardIdx >= 0) {
    this.el.addClass('cardFront');
  } else {
    this.el.addClass('cardBack');
  }

  var offX = (cardIdx % 13) * 50;
  var offY = Math.floor(cardIdx / 13) * 70;
  this.el.css('background-position', -offX + 'px' + ' ' + -offY + 'px')
};

TableView_Card.prototype.flipCard = function(cardIdx) {
  this.el.removeClass('cardFront cardBack cardFlip');

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

TableView_Card.prototype.setPosition = function(x, y) {
  this.el.css('left', x + 'px');
  this.el.css('top', y + 'px');
};

TableView_Card.prototype.moveTo = function(x, y, duration, complete) {
  this.el.animate({
    left: x + 'px',
    top: y + 'px'
  }, duration, complete);
};
