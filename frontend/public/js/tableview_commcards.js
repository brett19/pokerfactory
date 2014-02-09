function TableView_CommCards(table) {
  this.table = table;
  this.cards = [];
}

TableView_CommCards.prototype.dealCard = function(cardIdx) {
  var cardNum = this.cards.length;

  var card = new TableView_Card(this.table);
  card.flipCard(cardIdx);
  card.setPosition((960/2)+((cardNum-2.5)*54), (540/2)-60);

  this.cards.push(card);
};

TableView_CommCards.prototype.dealCards = function(cards) {
  var self = this;
  for (var i = 0; i < cards.length; ++i) {
    (function(cardNum) {
      setTimeout(function() {
        createjs.Sound.play('drawcard');
        self.dealCard(cards[cardNum]);
      }, 250 * cardNum);
    })(i);
  }
}

TableView_CommCards.prototype.addCard = function(cardIdx) {
  var cardNum = this.cards.length;

  var card = new TableView_Card(this.table);
  card.setCard(cardIdx);
  card.setPosition((960/2)+((cardNum-2.5)*54), (540/2)-60);

  this.cards.push(card);
};

TableView_CommCards.prototype.setCards = function(cards) {
  for (var i = 0; i < this.cards.length; ++i) {
    this.cards[i].remove();
  }
  this.cards = [];

  for (var i = 0; i < cards.length; ++i) {
    this.addCard(cards[i]);
  }
};
