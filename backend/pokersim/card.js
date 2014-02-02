var CARD_LNAMES = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];
var CARD_NAMES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
var CARD_LSUITS = ['spades', 'clubs', 'diamonds', 'hearts'];
var CARD_SUITS = ['s', 'c', 'd', 'h'];

function Card() {
  throw new Error('cards are integers, Card just has helpers');
}

Card.num = function(cardId) {
  return cardId % 13;
};

Card.suit = function(cardId) {
  return Math.floor(cardId/13);
};

Card.numText = function(numId) {
  return CARD_NAMES[numId];
};

Card.longNumText = function(numId) {
  return CARD_LNAMES[numId];
};

Card.suitText = function(suitId) {
  return CARD_SUITS[suitId];
};

Card.longSuitText = function(suitId) {
  return CARD_LSUITS[suitId];
};

Card.text = function(cardId) {
  var numId = this.num(cardId);
  var suitId = this.suit(cardId);
  return CARD_NAMES[numId] + CARD_SUITS[suitId];
};

Card.longText = function(cardId) {
  var numId = this.num(cardId);
  var suitId = this.suit(cardId);
  return CARD_LNAMES[numId] + ' of ' + CARD_LSUITS[suitId];
};

module.exports = Card;
