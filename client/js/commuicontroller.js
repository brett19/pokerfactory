function CommunityUiController() {
  this.cards = [];
}

CommunityUiController.prototype.dealCard = function(cardIdx) {
  var cardNum = this.cards.length;

  var card = new CardUiController();
  card.flipCard(cardIdx);
  card.setPosition((960/2)+((cardNum-2.5)*54), (540/2)-60);

  this.cards.push(card);
};

CommunityUiController.prototype.dealCards = function(cards) {
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

CommunityUiController.prototype.addCard = function(cardIdx) {
  var cardNum = this.cards.length;

  var card = new CardUiController();
  card.setCard(cardIdx);
  card.setPosition((960/2)+((cardNum-2.5)*54), (540/2)-60);

  this.cards.push(card);
};

CommunityUiController.prototype.setCards = function(cards) {
  for (var i = 0; i < this.cards.length; ++i) {
    this.cards[i].remove();
  }
  this.cards = [];

  for (var i = 0; i < cards.length; ++i) {
    this.addCard(cards[i]);
  }
};

var commUi = new CommunityUiController();
