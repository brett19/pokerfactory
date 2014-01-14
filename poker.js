var util = require('util');
var events = require('events');

/**
 * Randomize array element order in-place.
 * Using Fisher-Yates shuffle algorithm.
 */
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

var CARD_LNAMES = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];
var CARD_NAMES = [' 2', ' 3', ' 4', ' 5', ' 6', ' 7', ' 8', ' 9', '10', ' J', ' Q', ' K', ' A']; // 13
var CARD_SUITS = ['H', 'D', 'C', 'S']; // Hearts, Diamonds, Clubs, Spades
function cardSuit(idx) {
  return Math.floor(idx/13);
}
function cardNum(idx) {
  return idx % 13;
}
function cardText(idx) {
  return CARD_NAMES[cardNum(idx)] + CARD_SUITS[cardSuit(idx)];
}

function zzFindGroups(cards) {
  var cardsLeft = cards.slice(0);
  var groups = [];

  while (cardsLeft.length > 0) {
    var thisCardNum = cardNum(cardsLeft[0]);
    var foundNum = 1;

    // Search remaining cards for more of the same
    var newCardsLeft = [];
    for (var i = 1; i < cardsLeft.length; ++i) {
      var otherCardNum = cardNum(cardsLeft[i]);

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

function zzFindKickers(cards, ignores, num) {
  var cardsLeft = [];

  // Remove the ignores
  for (var i = 0; i < cards.length; ++i) {
    var thisCardNum = cardNum(cards[i]);
    if (ignores.indexOf(thisCardNum) === -1) {
      cardsLeft.push(thisCardNum);
    }
  }

  // Sort the array
  cardsLeft.sort(function(a,b){return b-a;});

  // Return the requested amount with the ignores in front
  return ignores.concat(cardsLeft.slice(0, num));
}

function zzIdentifyStraight(cards) {
  var highestStraight = -1;

  // Loop through picking starting points
  for (var i = 0; i < 7; ++i) {
    var myCardNum = cardNum(cards[i]);
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

        var otherCardNum = cardNum(cards[k]);
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

function zzIdentifyFh(groups) {
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

function zzIdentifyFoak(groups) {
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

function zzIdentifyFlush(cards) {
  for (var i = 0; i < 4; ++i) {
    var suitCards = [];
    for (var j = 0; j < 7; ++j) {
      var thisCardSuit = cardSuit(cards[j]);
      if (thisCardSuit !== i) {
        continue;
      }

      var thisCardNum = cardNum(cards[j]);
      suitCards.push(thisCardNum);
    }

    if (suitCards.length >= 5) {
      suitCards.sort(function(a,b) {return b-a;});
      return suitCards.slice(0, 5);
    }
  }

  return null;
}

function zzIdentifyToak(cards, groups) {
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

  return zzFindKickers(cards, [highestToak], 2);
}

function zzIdentifyTwoPair(cards, groups) {
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

  return zzFindKickers(cards, [highestPair1, highestPair2], 1);
}

function zzIdentifyPair(cards, groups) {
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

  return zzFindKickers(cards, [highestPair], 3);
}

function zzIdentifyHigh(cards) {
  var cardNums = [];
  for (var i = 0; i < cards.length; ++i) {
    cardNums.push(cardNum(cards[i]));
  }
  cardNums.sort(function(a,b) {return b-a;});
  return cardNums.slice(0, 5);
}

function zzIdentifyHand(community, player) {
  var cards = [].concat(community, player);
  var groups = zzFindGroups(cards);

  var straight = zzIdentifyStraight(cards);
  var flush = zzIdentifyFlush(cards);
  var fh = zzIdentifyFh(groups);
  var foak = zzIdentifyFoak(groups);

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

  var toak = zzIdentifyToak(cards, groups);
  if (toak) {
    return [3].concat(toak);
  }

  var tp = zzIdentifyTwoPair(cards, groups);
  if (tp) {
    return [2].concat(tp);
  }

  var pair = zzIdentifyPair(cards, groups);
  if (pair) {
    return [1].concat(pair);
  }

  return [0].concat(zzIdentifyHigh(cards));
}

function zzCompareHands(a, b) {
  if (!b) {
    return +1;
  }

  for (var i = 0; i < a.length; ++i) {
    if (a[i] > b[i]) {
      return +1;
    } else if (a[i] < b[i]) {
      return -1;
    }
  }
  return 0;
}

function identTypeText(type) {
  if (type === 9) return 'royal flush';
  if (type === 8) return 'straight flush';
  if (type === 7) return 'four of a kind';
  if (type === 6) return 'full house';
  if (type === 5) return 'flush';
  if (type === 4) return 'straight';
  if (type === 3) return 'three of a kind';
  if (type === 2) return 'two pair';
  if (type === 1) return 'pair';
  if (type === 0) return 'high card';
}

function identText(info) {
  var text = '';
  text += '(' + info[0] + ') ';
  text += identTypeText(info[0]);
  text += ' : ';
  for (var i = 1; i < info.length; ++i) {
    text += CARD_LNAMES[info[i]] + ' ';
  }
  return text;
}

function PokerPlayer(uuid, name, balance)
{
  this.uuid = uuid;
  this.name = name;
  this.balance = balance;
  this.hand = null;
  this.sittingOut = false;
  this.inHand = false;
  this.handBet = 0;
}

function PokerTable(uuid, name)
{
  this.uuid = uuid;
  this.name = name;
  this.maxPlayers = 4;
  this.blind = 100;

  this.players = [];

  this.handRunning = false;
  this.isShowdown = false;
  this.community = [];
  this.deck = null;
  this.curBet = 0;
  this.dealerPos = 0;
  this.actionPos = 0;
  this.lastActionPos = -1;
  this.lastOptionPos = -1;
  this.pots = [];

  // Set up the seats
  for (var i = 0; i < this.maxPlayers; ++i) {
    this.players[i] = null;
  }
}
util.inherits(PokerTable, events.EventEmitter);

PokerTable.prototype.getUuidPos = function(uuid) {
  for (var i = 0; i < this.players.length; ++i) {
    if (this.players[i] && this.players[i].uuid === uuid) {
      return i;
    }
  }
  return -1;
}

PokerTable.prototype.sitPlayer = function(idx, player) {
  if (this.players[idx]) {
    return false;
  }

  for (var i = 0; i < this.players.length; ++i) {
    if (this.players[i]) {
      if (this.players[i].uuid === player.uuid) {
        console.log('cannot sit, already at table');
        return;
      }
    }
  }

  this.players[idx] = player;
  this.emit('player_sat', idx);

  this.tryBeginHand();
  return true;
};

PokerTable.prototype.standPlayer = function(idx) {
  if (!this.players[idx]) {
    return false;
  }

  if (this.players[idx].inHand) {
    console.warn('in hand player tried to stand up');
    return false;
  }

  if (this.players[idx].handBet) {
    console.warn('player with money on table tried to stand up');
    return false;
  }

  this.players[idx] = null;
  this.emit('player_stood', idx);

  return true;
};

PokerTable.prototype.playerCanPlay = function(idx) {
  if (!this.players[idx]) {
    return false;
  }

  if (this.players[idx].balance < 40) {
    return false;
  }

  if (this.players[idx].sittingOut) {
    return false;
  }

  return true;
};

PokerTable.prototype.playerInHand = function(idx) {
  if (!this.players[idx]) {
    return false;
  }

  if (!this.players[idx].inHand) {
    return false;
  }

  return true;
};

PokerTable.prototype.playerCanAction = function(idx) {
  if (!this.players[idx]) {
    return false;
  }

  if (!this.players[idx].inHand) {
    return false;
  }

  if (this.players[idx].balance <= 0) {
    return false;
  }

  return true;
};

PokerTable.prototype._advanceAction = function() {
  for (var i = 1; i < this.maxPlayers; ++i) {
    var realIdx = this.actionPos + i;
    if (realIdx >= this.maxPlayers) {
      realIdx -= this.maxPlayers;
    }

    if (this.playerInHand(realIdx)) {
      this.actionPos = realIdx;
      return;
    }
  }

  throw new Error('tried to advance to invalid player');
};

PokerTable.prototype.actionOpts = function() {
  var player = this.players[this.actionPos];

  var bet_min = this.curBet * 2;
  var bet_max = player.balance + player.handBet;
  if (bet_min < this.blind * 2) {
    bet_min = this.blind * 2;
  }
  if (bet_min > bet_max) {
    bet_min = bet_max;
  }

  return {
    fold: true,
    check: player.handBet === this.curBet,
    call: player.handBet !== this.curBet,
    bet: this.curBet === 0 && player.balance + player.handBet > this.curBet,
    raise: this.curBet !== 0 && player.balance + player.handBet > this.curBet,
    bet_min: bet_min,
    bet_max: bet_max
  };
};

PokerTable.prototype.advanceAction = function(madeAction) {
  if (madeAction) {
    this.lastActionPos = this.actionPos;
    this.lastOptionPos = -1;
  }

  if (this.playersInHand() === 1) {
    console.info('only one player - advance play');
    // Only one player left
    this.advancePlay();
    return;
  }

  console.info('action info');
  console.info('  - action pos: ', this.actionPos);
  console.info('  - last action: ', this.lastActionPos);
  console.info('  - last option: ', this.lastOptionPos);

  // Loop to find next player who can actually make a move
  while(true) {
    if (this.lastActionPos === -1) {
      if (this.lastOptionPos === this.actionPos) {
        console.info('we were option - advance play');
        this.advancePlay();
        return;
      }
    }

    console.info('_advanceAction');
    this._advanceAction();

    console.log('   - new pos: ', this.actionPos);

    if (this.actionPos === this.lastActionPos) {
      console.info('we were last action - advance play');
      this.advancePlay();
      return;
    }

    if (this.playerCanAction(this.actionPos)) {
      console.log('we can action');
      break;
    }
  }

  var actionOpts = this.actionOpts();
  this.emit('action_moved', this.actionPos, actionOpts);
};

PokerTable.prototype.advanceDealer = function() {
  // Note we start at 1 here so we don't bring the dealer chip back
  //  to the same player.
  for (var i = 1; i < this.maxPlayers; ++i) {
    var realIdx = this.dealerPos + i;
    if (realIdx >= this.maxPlayers) {
      realIdx -= this.maxPlayers;
    }

    if (this.playerCanPlay(realIdx)) {
      this.dealerPos = realIdx;

      this.emit('dealer_moved', realIdx);

      return;
    }
  }

  throw new Error('no player to advance to')
};

PokerTable.prototype.playerAddPot = function(idx, amount) {
  var player = this.players[idx];

  if (player.balance < amount) {
    // Need to do side-pot!  Eek
  }

  player.balance -= amount;
  player.handBet += amount;

  this.emit('player_balance_changed', idx, player.balance);
  this.emit('player_bet_changed', idx, player.handBet);
};

PokerTable.prototype.playerFold = function(idx) {
  if (idx !== this.actionPos) {
    console.warn('non-action player tried to fold');
    return;
  }

  this.players[idx].inHand = false;
  this.removeFromPots(idx);

  this.emit('player_folded', idx);
  this.advanceAction(false);
};

PokerTable.prototype.playerCheck = function(idx) {
  if (idx !== this.actionPos) {
    console.warn('non-action player tried to check');
    return;
  }

  this.advanceAction(false);
};

PokerTable.prototype.playerCall = function(idx) {
  if (idx !== this.actionPos) {
    console.warn('non-action player tried to call');
    return;
  }

  var player = this.players[idx];
  var diffAmount = this.curBet - player.handBet;
  if (diffAmount > player.balance) {
    diffAmount = player.balance;
  }

  this.playerAddPot(idx, diffAmount);

  this.advanceAction(false);
};

PokerTable.prototype.playerBet = function(idx, amount) {
  if (idx !== this.actionPos) {
    console.warn('non-action player tried to bet');
    return;
  }
  if (this.curBet !== 0) {
    console.warn('tried to bet with an existing bet');
    return;
  }

  var player = this.players[idx];
  if (amount < this.blind * 2 && amount < player.balance) {
    console.warn('player tried to bet less than the minimum');
    return;
  }

  this.curBet = amount;
  this.playerAddPot(idx, amount - player.handBet);

  this.advanceAction(true);
};

PokerTable.prototype.playerRaise = function(idx, amount) {
  if (idx !== this.actionPos) {
    console.warn('non-action player tried to bet');
    return;
  }
  if (this.curBet === 0) {
    console.warn('tried to bet with no existing bet');
    return;
  }

  var player = this.players[idx];
  if (amount < this.curBet * 2 && amount < player.balance + player.handBet) {
    console.warn('player tried to bet less than the minimum');
    return;
  }

  this.curBet = amount;
  this.playerAddPot(idx, amount - player.handBet);

  this.advanceAction(true);
};

PokerTable.prototype.tryBeginHand = function() {
  if (this.handRunning) {
    return false;
  }

  var inHandPlayers = [];
  for (var i = 0; i < this.players.length; ++i) {
    if (!this.players[i]) {
      continue;
    }

    if (this.playerCanPlay(i)) {
      inHandPlayers.push(i);
    }
  }
  if (inHandPlayers.length < 2) {
    return false;
  }

  for (var i = 0; i < inHandPlayers.length; ++i) {
    var handPlayer = inHandPlayers[i];

    this.players[handPlayer].inHand = true;
    this.players[handPlayer].handBet = 0;
    this.players[handPlayer].hand = null;
  }

  this.beginHand();
  return true;
};

PokerTable.prototype.playersInHand = function() {
  var count = 0;
  for (var i = 0; i < this.players.length; ++i) {
    if (this.playerInHand(i)) {
      count++;
    }
  }
  return count;
};

PokerTable.prototype.resetHand = function() {
  this.community = [];
  this.pots = [];
  this.isShowdown = false;
};

PokerTable.prototype.beginHand = function() {
  this.handRunning = true;
  this.resetHand();

  this.advanceDealer();

  this.shuffleDeck();

  this.actionPos = this.dealerPos;

  // Take small blind
  this._advanceAction();
  this.curBet = this.blind;
  this.playerAddPot(this.actionPos, this.curBet);
  var smallBlindPos = this.actionPos;

  // Take big blind
  this._advanceAction();
  this.curBet *= 2;
  this.playerAddPot(this.actionPos, this.curBet);
  var bigBlindPos = this.actionPos;

  this.dealHands();

  this.lastActionPos = -1;
  this.lastOptionPos = -1;
  this.advanceAction(false);
  this.lastOptionPos = bigBlindPos;
};

PokerTable.prototype.dealCommCard = function() {
  var card = this.deck.shift();
  this.community.push(card);
  this.emit('community_dealt_card', card);
}

PokerTable.prototype.removeFromPots = function(idx) {
  for (var i = 0; i < this.pots.length; ++i) {
    var myIdx = this.pots[i].players.indexOf(idx);
    if (myIdx >= 0) {
      this.pots[i].players.splice(myIdx, 1);
    }
  }
};

PokerTable.prototype.collectBets = function() {
  while (true) {
    var potMin = 0;
    var potCount = 0;
    for (var i = 0; i < this.players.length; ++i) {
      if (!this.playerInHand(i)) {
        continue;
      }

      if (this.players[i] && this.players[i].handBet > 0) {
        var thisBet = this.players[i].handBet;
        if (potMin === 0 || thisBet < potMin) {
          potMin = thisBet;
        }
        potCount++;
      }
    }

    if (potMin === 0) {
      // No money to collect
      break;
    }

    var topPot = null;
    var potId = 0;
    if (this.pots.length > 0) {
      var potIdx = this.pots.length - 1;
      if (this.pots[potIdx].players.length === potCount) {
        // Same player count, reuse same pot.
        topPot = this.pots[potIdx];
        potId = potIdx;
      }
    }
    if (!topPot) {
      topPot = {
        amount: 0
      };
      this.pots.push(topPot);
      potId = this.pots.length - 1;
    }

    // Reinsert all the player indexes
    topPot.players = [];
    for (var i = 0; i < this.players.length; ++i) {
      if (this.players[i] && this.players[i].handBet > 0) {
        var myPotAmt = potMin;
        if (myPotAmt > this.players[i].handBet) {
          myPotAmt = this.players[i].handBet;
        }

        this.players[i].handBet -= myPotAmt;
        topPot.amount += myPotAmt;

        if (this.playerInHand(i)) {
          topPot.players.push(i);
        }

        this.emit('player_to_pot', i, potId, myPotAmt);
      }
    }
  }
};

PokerTable.prototype.continuePlay = function() {
  console.info('continue play');
  // If there are no valid moves, just advance play.
  var actionables = 0;
  for (var i = 0; i < this.players.length; ++i) {
    if (this.playerCanAction(i)) {
      actionables++;
    }
  }
  if (actionables <= 1) {
    console.info('no actioners - advance play');
    this.advancePlay();
    return;
  }

  this.curBet = 0;

  this.actionPos = this.dealerPos;
  this.lastActionPos = -1;
  this.lastOptionPos = -1;
  this.advanceAction(false);
  this.lastOptionPos = this.dealerPos;
};

PokerTable.prototype.advancePlay = function() {
  // Nobody can action right now.
  this.actionPos = -1;
  this.emit('action_moved', this.actionPos, null);

  console.info('advance play');

  // If there are no valid moves, just advance play.
  var actionables = 0;
  for (var i = 0; i < this.players.length; ++i) {
    if (this.playerCanAction(i)) {
      actionables++;
    }
  }
  if (actionables <= 1) {
    console.info('no actionables - showdown');
    this.doShowdown();
  }

  this.collectBets();

  setTimeout(function(){
    // If there is only 1 player left, immediately resolve
    if (this.playersInHand() === 1) {
      console.info('no players - resolve');
      this.completePlay();
      return;
    }

    if (this.community.length < 3) {
      this.dealCommCard();
      this.dealCommCard();
      this.dealCommCard();
      this.continuePlay();
    } else if (this.community.length < 4) {
      this.dealCommCard();
      this.continuePlay();
    } else if (this.community.length < 5) {
      this.dealCommCard();
      this.continuePlay();
    } else {
      // Done!
      console.info('end of hand - resolve');
      this.completePlay();
      return;
    }
  }.bind(this), 900);
};

PokerTable.prototype.resolvePot = function(idx) {
  var pot = this.pots[idx];

  if (pot.players.length <= 0) {
    throw new Error('pot with no player attached');
  }

  if (pot.players.length === 1) {
    var playerIdx = pot.players[0];
    var player = this.players[playerIdx];
    player.balance += pot.amount;
    this.emit('pot_to_player', idx, playerIdx, pot.amount);
    return;
  }

  var bestHand = null;
  var bestPlayers = [];

  for (var i = 0; i < pot.players.length; ++i) {
    var playerIdx = pot.players[i];
    var player = this.players[playerIdx];

    var hand = zzIdentifyHand(this.community, player.hand);
    var cmp = zzCompareHands(hand, bestHand);
    if (cmp > 0) {
      bestHand = hand;
      bestPlayers = [playerIdx];
    } else if (cmp === 0) {
      bestPlayers.push(playerIdx);
    }
  }

  var potAmount = Math.floor(pot.amount / bestPlayers.length);
  var potRemain = pot.amount - potAmount;

  for (var i = 0; i < bestPlayers.length; ++i) {
    var playerIdx = bestPlayers[i];
    var player = this.players[playerIdx];

    var myPotAmount = potAmount;
    if (i === 0) {
      myPotAmount += potRemain;
    }

    player.balance += myPotAmount;
    this.emit('pot_to_player', idx, playerIdx, myPotAmount);
  }

  pot.players = [];
  pot.amount = 0;
}

PokerTable.prototype.doShowdown = function() {
  if (this.isShowdown) {
    return;
  }

  this.isShowdown = true;

  for (var i = 0; i < this.players.length; ++i) {
    if (this.playerInHand(i)) {
      var player = this.players[i];
      this.emit('player_show_hand', i, player.hand);
    }
  }
};

PokerTable.prototype.completePlay = function() {
  this.doShowdown();

  for (var i = 0; i < this.pots.length; ++i) {
    this.resolvePot(i);
  }
  this.pots = [];

  this.handRunning = false;
  for (var i = 0; i < this.players.length; ++i) {
    if (this.players[i]) {
      this.players[i].inHand = false;
    }
  }

  setTimeout(function() {
    this.resetHand();
    this.emit('hand_finished');
    this.tryBeginHand();
  }.bind(this), 1800);
};

PokerTable.prototype.dealCardTo = function(idx) {
  var player = this.players[idx];
  if (player === null) {
    throw new Error('tried to deal card to empty seat');
  }

  if (player.hand === null) {
    player.hand = [];
  }

  if (player.hand.length >= 2) {
    throw new Error('too many hand cards');
  }

  var card = this.deck.shift();
  player.hand.push(card);

  this.emit('player_dealt_card', idx, card);
};

PokerTable.prototype.dealHands = function() {
  for (var i = 0; i < this.players.length; ++i) {
    if (this.playerInHand(i)) {
      this.dealCardTo(i);
    }
  }
  for (var i = 0; i < this.players.length; ++i) {
    if (this.playerInHand(i)) {
      this.dealCardTo(i);
    }
  }
}

PokerTable.prototype.shuffleDeck = function() {
  this.deck = [];
  for (var i = 0; i < 52; ++i) {
    this.deck[i] = i;
  }
  shuffleArray(this.deck);
};

PokerTable.prototype.playerInfo = function(uuid, idx) {
  var player = this.players[idx];
  if (!player) {
    return null;
  }

  var playerHand = null;
  if (player.hand !== null) {
    playerHand = [];
    for (var i = 0; i < player.hand.length; ++i) {
      if (player.uuid === uuid) {
        playerHand.push(player.hand[i]);
      } else {
        playerHand.push(-1);
      }
    }
  }

  return {
    uuid: player.uuid,
    name: player.name,
    balance: player.balance,
    handBet: player.handBet,
    hand: playerHand,
    myself: uuid === player.uuid
  };
};

PokerTable.prototype.playerInfos = function(uuid) {
  var playerInfos = [];
  for (var i = 0; i < this.players.length; ++i) {
    playerInfos.push(this.playerInfo(uuid, i));
  }
  return playerInfos;
};

PokerTable.prototype.potInfos = function() {
  var potInfos = [];
  for (var i = 0; i < this.pots.length; ++i) {
    potInfos.push(this.pots[i].amount);
  }
  return potInfos;
}

PokerTable.prototype.info = function(uuid) {
  var actionPlayer = this.players[this.actionPos];
  var actionOpts = null;
  if (actionPlayer && actionPlayer.uuid === uuid) {
    actionOpts = this.actionOpts();
  }

  return {
    uuid: this.uuid,
    name: this.name,
    maxPlayers: this.maxPlayers,
    dealerPos: this.dealerPos,
    actionPos: this.actionPos,
    community: this.community,
    pots: this.potInfos(),
    players: this.playerInfos(uuid),
    actionOpts: actionOpts
  };
};

PokerTable.prototype.debugPrint = function() {
  console.log('== ' + this.name + ' (' + this.uuid + ')');
  for (var i = 0; i < this.players.length; ++i) {
    var player = this.players[i];
    console.log('+ ' + player.name + ' (' + player.uuid + ')');
    if (player.hand) {
      console.log('  {' + cardText(player.hand[0]) + ' ' + cardText(player.hand[1]) + '}');
      if (this.community.length == 5) {
        var identInfo = zzIdentifyHand(this.community, player.hand);
        console.log(identText(identInfo));
      }
    }
  }
  for (var i = 0; i < this.community.length; ++i) {
    console.log('- ' + cardText(this.community[i]));
  }
};

module.exports.Table = PokerTable;
module.exports.Player = PokerPlayer;

/*
for (var i = 0; i < 1000; ++i) {
  var tbl = new PokerTable('0000', 'London');
  tbl.players.push(new PokerPlayer('1000', 'brett19', 200));
  tbl.players.push(new PokerPlayer('1001', 'representive', 200));

  tbl.shuffleDeck();
  tbl.dealHands();
  tbl.dealFlop();
  tbl.dealTurn();
  tbl.dealRiver();

  var info1 = zzIdentifyHand(tbl.community, tbl.players[0].hand);
  var info2 = zzIdentifyHand(tbl.community, tbl.players[0].hand);

  if (info1.indexOf('Straight') >= 0 || info2.indexOf('Straight') >= 0) {
    tbl.debugPrint();
  }
}
//*/

/*
var tbl = new PokerTable('0000', 'London');
tbl.players.push(new PokerPlayer('1000', 'brett19', 200));
tbl.players.push(new PokerPlayer('1001', 'representive', 200));

tbl.shuffleDeck();
tbl.dealHands();
tbl.dealFlop();
tbl.dealTurn();
tbl.dealRiver();

tbl.resolve();

tbl.debugPrint();
//*/
