var Chance = require('chance');

var chance = new Chance();

function Deck() {
  this._cards = [];

  /* NORMAL
  for (var i = 0; i < 52; ++i) {
    this._cards.push(i);
  }
  //*/

  //* HIGH CARDS ONLY
  for (var i = 0; i < 4; ++i) {
    this._cards.push(8 + i*13);
    this._cards.push(9 + i*13);
    this._cards.push(10 + i*13);
    this._cards.push(11 + i*13);
    this._cards.push(12 + i*13);
  }
  //*/
}

Deck.prototype.shuffle = function() {
  this._cards = chance.shuffle(this._cards);
};

Deck.prototype.push = function(card) {
  this._cards.unshift(card);
};

Deck.prototype.pop = function() {
  return this._cards.pop();
};

module.exports = Deck;
