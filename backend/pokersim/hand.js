var Card = require('./card');

function findGroups(cards) {
  var cardsLeft = cards.slice(0);
  var groups = [];

  while (cardsLeft.length > 0) {
    var thisCardNum = Card.num(cardsLeft[0]);
    var foundNum = 1;

    // Search remaining cards for more of the same
    var newCardsLeft = [];
    for (var i = 1; i < cardsLeft.length; ++i) {
      var otherCardNum = Card.num(cardsLeft[i]);

      if (otherCardNum === thisCardNum) {
        foundNum++;
      } else {
        newCardsLeft.push(cardsLeft[i]);
      }
    }
    cardsLeft = newCardsLeft;

    groups.push([thisCardNum, foundNum]);
  }

  return groups;
}

function holdemFindKickers(cards, ignores, num) {
  var cardsLeft = [];

  // Remove the ignores
  for (var i = 0; i < cards.length; ++i) {
    var thisCardNum = Card.num(cards[i]);
    if (ignores.indexOf(thisCardNum) === -1) {
      cardsLeft.push(thisCardNum);
    }
  }

  // Sort the array
  cardsLeft.sort(function(a,b){return b-a;});

  // Return the requested amount with the ignores in front
  return ignores.concat(cardsLeft.slice(0, num));
}

function holdemIdentifyStraight(cards) {
  var highestStraight = -1;

  // Loop through picking starting points
  for (var i = 0; i < 7; ++i) {
    var myCardNum = Card.num(cards[i]);
    var isStraight = true;

    // If this card is less than 5, don't bother searching.  It is not
    //  possible to make a straight with anything less than a 5 as a
    //  high card.
    if (myCardNum < 3) continue;

    // Search for all 4 remaining straight cards
    for (var j = 1; j < 5; ++j) {
      var neededCardNum = myCardNum - j;

      // Map -1 to Ace
      if (neededCardNum === -1 ) {
        neededCardNum = 12;
      }

      var foundCard = false;
      for (var k = 0; k < 7; ++k) {
        if (k === i) continue;

        var otherCardNum = Card.num(cards[k]);
        if (otherCardNum === neededCardNum) {
          foundCard = true;
          break;
        }
      }

      if (!foundCard) {
        isStraight = false;
        break;
      }
    }

    if (isStraight) {
      if (myCardNum > highestStraight) {
        highestStraight = myCardNum;
      }
    }
  }

  if (highestStraight !== -1) {
    return [highestStraight];
  }

  return null;
}

function holdemIdentifyFh(groups) {
  var highestOver = -1;
  for (var i = 0; i < groups.length; ++i) {
    if (groups[i][1] < 3) {
      continue;
    }

    if (groups[i][0] > highestOver) {
      highestOver = groups[i][0];
    }
  }
  if (highestOver === -1) {
    return null;
  }

  var highestUnder = -1;
  for (var i = 0; i < groups.length; ++i) {
    if (groups[i][0] === highestOver) {
      continue;
    }
    if (groups[i][1] < 2) {
      continue;
    }

    if (groups[i][0] > highestUnder) {
      highestUnder = groups[i][0];
    }
  }
  if (highestUnder === -1) {
    return null;
  }

  return [highestOver, highestUnder];
}

function holdemIdentifyFoak(groups) {
  var highestFoak = -1;

  for (var i = 0; i < groups.length; ++i) {
    if (groups[i][1] === 4) {
      if (groups[i][0] > highestFoak) {
        highestFoak = groups[i][0];
      }
    }
  }

  if (highestFoak !== -1) {
    // There can only be 1 four-of-a-kind in any specific dealing
    //  of texas holdem cards, so we don't bother adding in the high
    //  card here.
    return [highestFoak];
  }
  return null;
}

function holdemIdentifyFlush(cards) {
  if (cards.length < 5) {
    return null;
  }

  for (var i = 0; i < 4; ++i) {
    var suitCards = [];
    for (var j = 0; j < 7; ++j) {
      var thisCardSuit = Card.suit(cards[j]);
      if (thisCardSuit !== i) {
        continue;
      }

      var thisCardNum = Card.num(cards[j]);
      suitCards.push(thisCardNum);
    }

    if (suitCards.length >= 5) {
      suitCards.sort(function(a,b) {return b-a;});
      return suitCards.slice(0, 5);
    }
  }

  return null;
}

function holdemIdentifyToak(cards, groups) {
  if (cards.length < 3) {
    return null;
  }

  var highestToak = -1;
  for (var i = 0; i < groups.length; ++i) {
    if (groups[i][1] !== 3) {
      continue;
    }

    if (groups[i][0] > highestToak) {
      highestToak = groups[i][0];
    }
  }
  if (highestToak === -1) {
    return null;
  }

  return holdemFindKickers(cards, [highestToak], 2);
}

function holdemIdentifyTwoPair(cards, groups) {
  if (cards.length < 4) {
    return null;
  }

  var highestPair1 = -1;
  for (var i = 0; i < groups.length; ++i) {
    if (groups[i][1] !== 2) {
      continue;
    }

    if (groups[i][0] > highestPair1) {
      highestPair1 = groups[i][0];
    }
  }
  if (highestPair1 === -1) {
    return null;
  }

  var highestPair2 = -1;
  for (var i = 0; i < groups.length; ++i) {
    if (groups[i][0] === highestPair1) {
      continue;
    }
    if (groups[i][1] !== 2) {
      continue;
    }

    if (groups[i][0] > highestPair2) {
      highestPair2 = groups[i][0];
    }
  }
  if (highestPair2 === -1) {
    return null;
  }

  return holdemFindKickers(cards, [highestPair1, highestPair2], 1);
}

function holdemIdentifyPair(cards, groups) {
  if (cards.length < 2) {
    return null;
  }

  var highestPair = -1;
  for (var i = 0; i < groups.length; ++i) {
    if (groups[i][1] !== 2) {
      continue;
    }

    if (groups[i][0] > highestPair) {
      highestPair = groups[i][0];
    }
  }
  if (highestPair === -1) {
    return null;
  }

  return holdemFindKickers(cards, [highestPair], 3);
}

function holdemIdentifyHigh(cards) {
  var cardNums = [];
  for (var i = 0; i < cards.length; ++i) {
    cardNums.push(Card.num(cards[i]));
  }
  cardNums.sort(function(a,b) {return b-a;});
  return cardNums.slice(0, 5);
}

function holdemIdentifyHand(community, player) {
  var cards = [].concat(community, player);
  var groups = findGroups(cards);

  var straight = holdemIdentifyStraight(cards);
  var flush = holdemIdentifyFlush(cards);
  var fh = holdemIdentifyFh(groups);
  var foak = holdemIdentifyFoak(groups);

  if (straight && flush) {
    // If the straight is ace-high, royal!
    if (straight[1] === 12) {
      return [9].concat(straight);
    } else {
      return [8].concat(straight);
    }
  } else if (foak) {
    return [7].concat(foak);
  } else if (fh) {
    return [6].concat(fh);
  } else if (flush) {
    return [5].concat(flush);
  } else if (straight) {
    return [4].concat(straight);
  }

  var toak = holdemIdentifyToak(cards, groups);
  if (toak) {
    return [3].concat(toak);
  }

  var tp = holdemIdentifyTwoPair(cards, groups);
  if (tp) {
    return [2].concat(tp);
  }

  var pair = holdemIdentifyPair(cards, groups);
  if (pair) {
    return [1].concat(pair);
  }

  return [0].concat(holdemIdentifyHigh(cards));
}

function Hand(hand) {
  this.hand = hand;
};

Hand.prototype.text = function() {
  if (!this.hand || this.hand.length < 1) {
    return 'invalid hand';
  }

  var handType = this.hand[0];
  var text = '';
  if (handType === 0) {
    text += 'high card ';
    text += Card.longNumText(this.hand[1]);
  } else if (handType === 1) {
    text += 'pair of ';
    text += Card.longNumText(this.hand[1]) + '\'s';
  } else if (handType === 2) {
    text += 'two pair, ';
    text += Card.longNumText(this.hand[1]) + '\'s';
    text += ' and ';
    text += Card.longNumText(this.hand[2]) + '\'s';
  } else if (handType === 3) {
    text += 'three of a kind, ';
    text += Card.longNumText(this.hand[1]) + '\'s';
  } else if (handType === 4) {
    text += 'straight, ';
    text += Card.longNumText(this.hand[1]);
    text += ' high';
  } else if (handType === 5) {
    text += 'flush, ';
    text += Card.longNumText(this.hand[1]);
    text += ' high';
  } else if (handType === 6) {
    text += 'full house, ';
    text += Card.longNumText(this.hand[1]) + '\'s';
    text += ' over ';
    text += Card.longNumText(this.hand[2]) + '\'s';
  } else if (handType === 7) {
    text += 'four of a kind, ';
    text += Card.longNumText(this.hand[1]) + '\'s';
  } else if (handType === 8) {
    text += 'straight flush, ';
    text += Card.longNumText(this.hand[1]);
    text += ' high';
  } else if (handType === 9) {
    text += 'royal flush, ';
    text += Card.longNumText(this.hand[1]);
    text += ' high';
  } else {
    text += 'invalid hand';
  }
  return text;
};

var HAND_DBGTYPETEXT = ['high card', 'pair', 'two pair', 'three of a kind',
  'straight', 'flush', 'full house', 'four of a kind', 'straight flush',
  'royal flush'];
Hand.prototype.debugText = function() {
  if (!this.hand || this.hand.length < 1) {
    return 'invalid hand';
  }

  var handType = this.hand[0];
  var text = HAND_DBGTYPETEXT[handType];
  for (var i = 1; i < this.hand.length; ++i) {
    text += ' ' + Card.longNumText(this.hand[i]);
  }
  return text;
};

Hand.holdemFromCards = function(community, player) {
  return new Hand(holdemIdentifyHand(community, player));
};

Hand.compare = function(a, b) {
  var _a = a ? a.hand : null;
  var _b = b ? b.hand : null;

  if (_a && _a.length === 0) {
    _a = null;
  }
  if (_b && _b.length === 0) {
    _b = null;
  }

  if (!_a && !_b) {
    return 0;
  } else if (!_a) {
    return -1;
  } else if (!_b) {
    return +1;
  }

  if (_a[0] == _b[0] && _a.length != _b.length) {
    throw new Error('same hand type but different counts');
  }

  for (var i = 0; i < _a.length; ++i) {
    if (_a[i] > _b[i]) {
      return +1;
    } else if (_a[i] < _b[i]) {
      return -1;
    }
  }
  return 0;
};

module.exports = Hand;
