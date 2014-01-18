var util = require('util');
var events = require('events');
var Card = require('./card');
var Hand = require('./hand');
var Deck = require('./deck');
var Logger = require('./logger');

function PokerPlayer(uuid, name, balance)
{
  this.uuid = uuid;
  this.name = name;
  this.balance = balance;
  this.autoPayBlinds = false;
  this.sittingOut = false;
  this.inHand = false;
  this.holeCards = [];
  this.bet = 0;
}

function PokerTable(uuid, _opts)
{
  var opts = {
    seatCount: 4,
    blindsDuration: 5000,
    blindsLevels: [
      [100, 25],
      [200, 50],
      [400, 100],
      [1000, 250]
    ]
  };

  this.uuid = uuid;
  this.blindsDuration = opts.blindsDuration;
  this.blindsLevels = opts.blindsLevels;
  this.blindsLevel = 0;
  this.blindsStart = Date.now();
  this.blinds = this.blindsLevels[this.blindsLevel][0];
  this.ante = this.blindsLevels[this.blindsLevel][1];

  this.state = 0;
  this.isShowdown = false;
  this.communityCards = [];
  this.deck = null;
  this.curBet = 0;
  this.dealerPos = -1;
  this.actionPos = -1;
  this.smallBlindPos = -1;
  this.bigBlindPos = -1;
  this.lastActionPos = -1;
  this.optionPos = -1;
  this.pots = [];

  this.actionTimer = null;
  this.actionTimerEnd = 0;
  this.actionTimerLen = 0;

  this.seats = [];
  for (var i = 0; i < opts.seatCount; ++i) {
    this.seats[i] = null;
  }
}
util.inherits(PokerTable, events.EventEmitter);










/*
 HELPER FUNCTIONS
 */
PokerTable.prototype._players = function(startAt, handler) {
  if (handler === undefined) {
    handler = startAt;
    startAt = 0;
  }

  for (var i = 0; i < this.seats.length; ++i) {
    var realIdx = startAt + i;
    while (realIdx >= this.seats.length) {
      realIdx -= this.seats.length;
    }

    var seat = this.seats[realIdx];
    if (!seat) {
      continue;
    }

    if (handler.call(this, realIdx, seat) === false) {
      break;
    }
  }
};

PokerTable.prototype.getPosFromUuid = function(uuid) {
  var foundIdx = -1;
  this._players(function(idx, player) {
    if (player.uuid === uuid) {
      foundIdx = idx;
      return false;
    }
  });
  return foundIdx;
};

PokerTable.prototype.isValidSeat = function(seatIdx) {
  if (seatIdx < 0 || seatIdx >= this.seats.length) {
    return false;
  }
  if (!this.seats[seatIdx]) {
    return false;
  }
  return true;
};

PokerTable.prototype.playerCanPlay = function(idx) {
  if (!this.seats[idx]) {
    return false;
  }

  if (this.seats[idx].sittingOut) {
    return false;
  }

  if (this.seats[idx].balance <= 0) {
    return false;
  }

  return true;
};

PokerTable.prototype.seatsTaken = function() {
  var seatedCount = 0;
  for (var i = 0; i < this.seats.length; ++i) {
    if (this.seats[i]) {
      seatedCount++;
    }
  }
  return seatedCount;
}

PokerTable.prototype.playerInHand = function(idx) {
  if (!this.seats[idx]) {
    return false;
  }

  if (!this.seats[idx].inHand) {
    return false;
  }

  return true;
};

PokerTable.prototype.playerHasOptions = function(idx) {
  if (!this.seats[idx]) {
    return false;
  }

  if (!this.seats[idx].inHand) {
    return false;
  }

  if (this.seats[idx].balance <= 0) {
    return false;
  }

  return true;
};

PokerTable.prototype.nextInHandPosition = function(currentIdx) {
  var newPosition = currentIdx;
  this._players(currentIdx + 1, function(idx, player) {
    if (!player.inHand) {
      return;
    }

    Logger.debug('next hand pos :', currentIdx, ':', idx);

    newPosition = idx;
    return false;
  });
  return newPosition;
};










/*
 PLAYER ACTIONS
 */
PokerTable.prototype.playerSit = function(seatIdx, player) {
  if (this.seats[seatIdx]) {
    Logger.debug('cannot sit, seat taken');
    return false;
  }

  var currentSeatIdx = this.getPosFromUuid(player.uuid);
  if (currentSeatIdx !== -1) {
    Logger.warn('cannot sit, already at table');
    return false;
  }

  this.seats[seatIdx] = player;
  this.emit('player_sat', seatIdx, player);

  this.tryBeginHand();
  return true;
};

PokerTable.prototype.playerStandUp = function(seatIdx) {
  if (!this.isValidSeat(seatIdx)) {
    Logger.warn('cannot stand up, invalid seat index');
    return false;
  }

  if (this.seats[seatIdx].inHand) {
    Logger.warn('in hand player tried to stand up');
    return false;
  }

  if (this.seats[seatIdx].bet) {
    Logger.warn('player with money on table tried to stand up');
    return false;
  }

  this.seats[seatIdx] = null;
  this.emit('player_stood', seatIdx);

  return true;
};

PokerTable.prototype.playerSitOut = function(seatIdx) {
  if (!this.isValidSeat(seatIdx)) {
    Logger.warn('cannot sit out, invalid seat index');
    return false;
  }

  var player = this.seats[seatIdx];

  if (player.sittingOut) {
    Logger.warn('sit out failed - already sat out');
    return false;
  }

  Logger.debug('player sitting out :', seatIdx);

  player.sittingOut = true;
  this.emit('player_satout', seatIdx);

  return true;
};

PokerTable.prototype.playerSitIn = function(seatIdx) {
  if (!this.isValidSeat(seatIdx)) {
    Logger.warn('cannot sit in, invalid seat index');
    return false;
  }

  var player = this.seats[seatIdx];

  if (player.sittingOut) {
    Logger.warn('sit in failed - already sitting in');
    return false;
  }

  if (player.balance === 0) {
    Logger.warn('sit in failed - not enough chips');
    return false;
  }

  Logger.debug('player sitting in :', seatIdx);

  player.sittingOut = false;
  this.emit('player_satin', seatIdx);

  this.tryBeginHand();
  return true;
};

PokerTable.prototype.playerSmallBlind = function(seatIdx) {
  Logger.debug('action : pay small blind');

  if (seatIdx !== this.actionPos) {
    Logger.warn('non-action player tried to pay small blind');
    return;
  }

  this._doBetAmount(seatIdx, this.blinds);
  this.smallBlindPos = seatIdx;

  Logger.debug('small blind of', this.blinds, 'paid by', this.smallBlindPos);

  this.advanceBlindAction();
};

PokerTable.prototype.playerBigBlind = function(seatIdx) {
  Logger.debug('action : pay big blind');

  if (seatIdx !== this.actionPos) {
    Logger.warn('non-action player tried to pay big blind');
    return;
  }

  this._doBetAmount(seatIdx, this.blinds * 2);
  this.bigBlindPos = seatIdx;

  Logger.debug('big blind of', this.blinds * 2, 'paid by', this.bigBlindPos);

  this.advanceBlindAction();
};









/*
 PLAYER BETTING OPTIONS
 */
PokerTable.prototype.playerFold = function(seatIdx) {
  Logger.debug('action : fold');

  if (seatIdx !== this.actionPos) {
    Logger.warn('non-action player tried to fold');
    return;
  }

  this.seats[seatIdx].inHand = false;
  this.removeFromPots(seatIdx);

  this.emit('player_folded', seatIdx);

  this.advanceAction();
};

PokerTable.prototype.playerCheck = function(seatIdx) {
  Logger.debug('action : check');

  if (seatIdx !== this.actionPos) {
    Logger.warn('non-action player tried to check');
    return;
  }

  this.advanceAction();
};

PokerTable.prototype.playerCall = function(seatIdx) {
  Logger.debug('action : call');

  if (seatIdx !== this.actionPos) {
    Logger.warn('non-action player tried to call');
    return;
  }

  var player = this.seats[seatIdx];
  var diffAmount = this.curBet - player.bet;
  if (diffAmount > player.balance) {
    diffAmount = player.balance;
  }

  this._doBetAmount(seatIdx, diffAmount);

  this.advanceAction();
};

PokerTable.prototype.playerBet = function(seatIdx, amount) {
  Logger.debug('action : bet :', amount);

  if (seatIdx !== this.actionPos) {
    Logger.warn('non-action player tried to bet');
    return;
  }
  if (this.curBet !== 0) {
    Logger.warn('tried to bet with an existing bet');
    return;
  }

  var player = this.seats[seatIdx];
  if (amount < this.blinds * 2 && amount < player.balance) {
    Logger.warn('player tried to bet less than the minimum');
    Logger.warn('   - ', this.blinds * 2, player.balance);
    return;
  }

  if (amount > player.balance + player.bet) {
    amount = player.balance + player.bet;
  }

  this._doBetAmount(seatIdx, amount - player.bet);

  this.lastActionPos = seatIdx;
  this.advanceAction();
};

PokerTable.prototype.playerRaise = function(seatIdx, amount) {
  Logger.debug('action : raise :', amount);

  if (seatIdx !== this.actionPos) {
    Logger.warn('non-action player tried to bet');
    return;
  }
  if (this.curBet === 0) {
    Logger.warn('tried to raise with no existing bet');
    return;
  }

  var player = this.seats[seatIdx];
  if (amount < this.curBet * 2 && amount < player.balance + player.bet) {
    Logger.warn(' - player tried to raise less than the minimum');
    Logger.warn('   - ', this.curBet * 2, player.balance + player.bet);
    return;
  }

  this._doBetAmount(seatIdx, amount - player.bet)

  this.lastActionPos = seatIdx;
  this.advanceAction();
};









PokerTable.prototype.checkBlindsLevel = function() {
  Logger.debug('check blinds level :', this.blindsLevel);

  if (this.blindsDuration === 0) {
    return;
  }

  if (Date.now() < this.blindsStart + this.blindsDuration) {
    return;
  }

  // TODO: Need to handle multiple levels between checks

  this.blindsLevel++;
  this.blindsStart = Date.now();
  this.blinds = this.blindsLevels[this.blindsLevel][0];
  this.ante = this.blindsLevels[this.blindsLevel][1];

  Logger.debug('blinds changed :', this.blindsLevel, ':', this.blinds, ':', this.ante);
};

PokerTable.prototype.actionOpts = function(seatIdx) {
  var player = this.seats[seatIdx];
  if (!player) {
    Logger.warn('tried to get action options for empty seat :', seatIdx);
    return null;
  }

  if (this.smallBlindPos === -1 || this.bigBlindPos === -1) {
    if (seatIdx !== this.actionPos) {
      return null;
    }

    var needPaySmall = false;
    var needPayBig = false;
    if (this.smallBlindPos === -1) {
      needPaySmall = true;
    } else if (this.bigBlindPos === -1) {
      needPayBig = true;
    }

    return {
      type: 'blinds',
      auto: player.autoPayBlinds,
      small: needPaySmall,
      big: needPayBig
    };
  }

  var bet_allin = player.balance + player.bet;
  var bet_min = this.curBet * 2;
  var bet_max = bet_allin;

  if (bet_min === 0) {
    bet_min = this.blinds * 2;
  } else if(bet_min > player.balance + player.bet) {
    bet_min = player.balance + player.bet;
  }
  if (bet_min > bet_max) {
    bet_min = bet_max;
  }

  var canBet = true;
  if (this.playersWithOptions() === 1) {
    canBet = false;
  }
  if (this.curBet > bet_max) {
    canBet = false;
  }

  var callCost = this.curBet - player.bet;
  if (callCost > player.balance) {
    callCost = player.balance;
  }

  Logger.debug('action_options :', seatIdx);
  Logger.debug(' - balance :', player.balance);
  Logger.debug(' - bet :', player.bet);
  Logger.debug(' - curBet :', this.curBet);
  Logger.debug(' - blinds :', this.blinds);
  Logger.debug(' - call_cost :', callCost);
  Logger.debug(' - bet_range :', bet_min, bet_max, bet_allin);

  return {
    type: 'bet',
    fold: true,
    check: player.bet === this.curBet,
    call: player.bet !== this.curBet ? callCost : 0,
    bet: this.curBet === 0 && canBet,
    raise: this.curBet !== 0 && canBet,
    bet_min: bet_min,
    bet_max: bet_max,
    bet_allin: bet_allin,
    curbet: player.bet
  };
}

PokerTable.prototype.startActionTimer = function(length) {
  this.actionTimerLen = length;
  this.actionTimerEnd = Date.now() + length;

  var actionPos = this.actionPos;
  this.actionTimer = setTimeout(function() {
    if (this.actionPos !== actionPos) {
      Logger.warn('action timer tripped, but action moved');
      return;
    }
    this.handleActionTimer();
  }.bind(this), length);
};

PokerTable.prototype.handleActionTimer = function() {
  // ++++ TESTING STUFF ++++
  if (this.smallBlindPos === -1 || this.bigBlindPos === -1) {
    // Force paying blinds for testing
    if (this.smallBlindPos === -1) {
      this.playerSmallBlind(this.actionPos);
    } else if (this.bigBlindPos === -1) {
      this.playerBigBlind(this.actionPos);
    }
  } else {
    // No betting auto-action for testing
  }
  return;
  // ---- TESTING STUFF ----


  var actionOpts = this.actionOpts(this.actionPos);
  if (actionOpts.check) {
    this.playerCheck(this.actionPos);
  } else {
    this.playerFold(this.actionPos);

    // Try to sitout this player
    this.playerSitOut(this.actionPos);
  }
};

PokerTable.prototype.clearActionTimer = function() {
  if (this.actionTimer) {
    clearTimeout(this.actionTimer);
    this.actionTimer = null;
    this.actionTimerLen = 0;
    this.actionTimerEnd = 0;
  }
};

var BLINDACTION_TIME = 5000;

PokerTable.prototype.advanceBlindAction = function() {
  Logger.debug('advance blind action');

  this.clearActionTimer();

  // LOGIC ERRORS HERE IF PEOPLE SKIP BLINDS

  if (this.smallBlindPos !== -1 && this.bigBlindPos !== -1) {
    // Blinds payed.
    this.continueBeginHand();
    return;
  }

  this._advanceAction();
  Logger.debug('new action pos: ', this.actionPos);

  this.startActionTimer(BLINDACTION_TIME);

  this.emit('action_moved', this.actionPos, BLINDACTION_TIME);

  var actionPlayer = this.seats[this.actionPos];
  if (actionPlayer.autoPayBlinds) {
    if (this.smallBlindPos === -1) {
      this.playerSmallBlind(this.actionPos);
    } else if (this.bigBlindPos === -1) {
      this.playerBigBlind(this.actionPos);
    }
  }
};

var ACTION_TIME = 15000;

PokerTable.prototype.advanceAction = function() {
  Logger.debug('advance action');

  this.clearActionTimer();

  if (this.playersInHand() === 1) {
    Logger.debug('only one player - advance play');
    // Only one player left
    this.advancePlay();
    return;
  }

  // Loop to find next player who can actually make a move
  while(true) {
    if (this.lastActionPos === -1) {
      if (this.optionPos === this.actionPos) {
        Logger.debug('we were option - advance play');
        this.advancePlay();
        return;
      }
    }

    this._advanceAction();
    Logger.debug('new action pos: ', this.actionPos);

    // If your the last one, and your already covering, immediately continue
    var actionPlayer = this.seats[this.actionPos];
    if (this.playersWithOptions() === 1 && actionPlayer.bet >= this.curBet) {
      Logger.debug('alone on option, already covering - advance play');
      this.advancePlay();
      return;
    }

    if (this.actionPos === this.lastActionPos) {
      Logger.debug('we were last action - advance play');
      this.advancePlay();
      return;
    }

    if (this.playerHasOptions(this.actionPos)) {
      break;
    }
  }

  this.startActionTimer(ACTION_TIME);

  this.emit('action_moved', this.actionPos, ACTION_TIME);
};

PokerTable.prototype._advanceAction = function() {
  var newActionPos = this.nextInHandPosition(this.actionPos);

  if (newActionPos === this.actionPos) {
    console.warn('could not locate valid new action position');
    return false;
  }

  this.actionPos = newActionPos;
};

PokerTable.prototype.advanceDealer = function() {
  var newDealerPos = this.nextInHandPosition(this.dealerPos);

  if (newDealerPos === this.dealerPos) {
    console.warn('could not locate valid new dealer');
    return false;
  }

  this.dealerPos = newDealerPos;
  this.emit('dealer_moved', newDealerPos);
};

PokerTable.prototype.playersInHand = function() {
  var count = 0;
  for (var i = 0; i < this.seats.length; ++i) {
    if (this.playerInHand(i)) {
      count++;
    }
  }
  return count;
};

PokerTable.prototype.resetHand = function() {
  Logger.debug('reset hand');

  for (var i = 0; i < this.seats.length; ++i) {
    var player = this.seats[i];
    if (!player) {
      continue;
    }

    if (player.bet !== 0) {
      Logger.warn('players bet was not 0');
    }

    player.inHand = false;
    player.holeCards = [];
  }

  this.communityCards = [];
  this.pots = [];
  this.isShowdown = false;
  this.curBet = 0;
  this.actionPos = -1;
  this.lastActionPos = -1;
  this.optionPos = -1;
  this.smallBlindPos = -1;
  this.bigBlindPos = -1;
};

PokerTable.prototype.tryBeginHand = function() {
  Logger.debug('trying to begin hand');

  if (this.state !== 0) {
    Logger.debug('hand already running :', this.state);
    return false;
  }

  var inHandPlayers = [];
  // Get everyone to join the hand
  this._players(function(idx, player) {
    // Error Checking
    if (player.inHand) {
      Logger.warn('player already in hand at hand start');
      player.inHand = false;
    }
    if (player.bet > 0) {
      Logger.warn('player already has hand bet at start of hand');
      player.bet = 0;
    }

    // Don't deal-in players who are sitting out
    if (player.sittingOut) {
      return;
    }

    // Add to hand
    inHandPlayers.push(idx);
  });

  if (inHandPlayers.length < 2) {
    Logger.debug('not enough players to start hand');
    return false;
  }

  for (var i = 0; i < inHandPlayers.length; ++i) {
    var playerIdx = inHandPlayers[i];
    var player = this.seats[playerIdx];
    player.inHand = true;
  }

  this.beginHand();
  return true;
};

PokerTable.prototype.checkBeginHand = function() {
  if (this.state !== 0) {
    Logger.error('hand started while state was not 0');
  }
  if (this.actionPos !== -1) {
    Logger.warn('hand started with a previous action position');
    this.actionPos = -1;
  }
  if (this.lastActionPos !== -1) {
    Logger.warn('hand started with a previous last action pos');
    this.lastActionPos = -1;
  }
  if (this.optionPos !== -1) {
    Logger.warn('hand started with a previous option position');
    this.optionPos = -1;
  }
  if (this.smallBlindPos !== -1) {
    Logger.warn('hand started with a previous small blind position');
    this.smallBlindPos = -1;
  }
  if (this.bigBlindPos !== -1) {
    Logger.warn('hand started with a previous big blind position');
    this.bigBlindPos = -1;
  }
};

/**
 * This must ONLY be called during blind acquisition.
 */
PokerTable.prototype.cancelPlay = function() {
  // Remove action from anyone
  this.actionPos = -1;
  this.emit('action_moved', this.actionPos, null);

  // Return all bets
  this._players(function(idx, player) {
    if (player.bet > 0) {
      this._doBetAmount(idx, -player.bet);
    }
  });

  // Complete Play
  this.completePlay();
};

PokerTable.prototype.beginHand = function() {
  Logger.debug('beginning hand');

  // Check for errors
  this.checkBeginHand();

  // Start the hand
  this.state = 1;

  // Check for blinds changes
  this.checkBlindsLevel();

  // Advance the dealer
  this.advanceDealer();
  Logger.debug('seat', this.dealerPos, 'select as the dealer');

  // Generate a new deck to play with
  this.newDeck();
  Logger.debug('deck shuffled');

  // Take Antes
  this.betAntes(function() {
    // Set action on the dealer
    this.actionPos = this.dealerPos;

    this.advanceBlindAction();
  }.bind(this));
};

PokerTable.prototype.continueBeginHand = function() {
  Logger.debug('continue begin hand');

  this.dealHands();
  Logger.debug('dealt hands');

  this.advanceAction();

  this.optionPos = this.bigBlindPos;

  this.logDebug();
};

PokerTable.prototype.betAntes = function(callback) {
  if (this.ante === 0) {
    callback();
    return;
  }

  this._players(function (idx, player) {
    if (!player.inHand) {
      return;
    }

    this._doBetAmount(idx, this.ante);
  });

  this.collectBets(function() {
    callback();
  }.bind(this));
};

PokerTable.prototype._doBetAmount = function(seatIdx, amount) {
  var player = this.seats[seatIdx];
  if (!player) {
    throw new Error('Invalid player tried to add bet amount');
  }

  if (amount > player.balance) {
    amount = player.balance;
  }

  if (this.curBet < player.bet + amount) {
    this.curBet = player.bet + amount;
  }

  player.balance -= amount;
  player.bet += amount;

  this.emit('player_balance_changed', seatIdx, player.balance);
  this.emit('player_bet_changed', seatIdx, player.bet);
};

var FLOP_DEAL_TIME = 1000;
var TURN_DEAL_TIME = 700;
var RIVER_DEAL_TIME = 700;

PokerTable.prototype.dealFlop = function(callback) {

  if (this.communityCards.length !== 0) {
    Logger.warn('tried to deal flop while communityCards != 0');
  }

  while (this.communityCards.length < 3) {
    this.communityCards.push(this.deck.pop());
  }

  this.emit('dealt_flop', FLOP_DEAL_TIME);

  setTimeout(callback, FLOP_DEAL_TIME);
};

PokerTable.prototype.dealTurn = function(callback) {
  if (this.communityCards.length !== 3) {
    Logger.warn('tried to deal turn while communityCards != 3');
  }

  while (this.communityCards.length < 4) {
    this.communityCards.push(this.deck.pop());
  }

  this.emit('dealt_turn', TURN_DEAL_TIME);

  setTimeout(callback, TURN_DEAL_TIME);
};

PokerTable.prototype.dealRiver = function(callback) {
  if (this.communityCards.length !== 4) {
    Logger.warn('tried to deal turn while communityCards != 4');
  }

  while (this.communityCards.length < 5) {
    this.communityCards.push(this.deck.pop());
  }

  this.emit('dealt_river', RIVER_DEAL_TIME);

  setTimeout(callback, RIVER_DEAL_TIME);
};

PokerTable.prototype.removeFromPots = function(idx) {
  for (var i = 0; i < this.pots.length; ++i) {
    var myIdx = this.pots[i].players.indexOf(idx);
    if (myIdx >= 0) {
      this.pots[i].players.splice(myIdx, 1);
    }
  }
};

var COLLECT_TIME = 1000;

PokerTable.prototype.collectBets = function(handler) {
  while (true) {
    var potMin = 0;
    var potCount = 0;
    for (var i = 0; i < this.seats.length; ++i) {
      if (!this.playerInHand(i)) {
        continue;
      }

      if (this.seats[i] && this.seats[i].bet > 0) {
        var thisBet = this.seats[i].bet;
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
    for (var i = 0; i < this.seats.length; ++i) {
      if (this.seats[i] && this.seats[i].bet > 0) {
        var myPotAmt = potMin;
        if (myPotAmt > this.seats[i].bet) {
          myPotAmt = this.seats[i].bet;
        }

        this.seats[i].bet -= myPotAmt;
        topPot.amount += myPotAmt;

        if (this.playerInHand(i)) {
          topPot.players.push(i);
        }

        this.emit('player_to_pot', i, potId, myPotAmt, COLLECT_TIME);
      }
    }
  }

  this.curBet = 0;

  setTimeout(handler, COLLECT_TIME);
};

PokerTable.prototype.playersWithOptions = function() {
  var count = 0;
  for (var i = 0; i < this.seats.length; ++i) {
    if (this.playerHasOptions(i)) {
      count++;
    }
  }
  return count;
};

PokerTable.prototype.continuePlay = function() {
  Logger.debug('continue play');

  // If there are no valid moves, just advance play.
  if (this.playersWithOptions() <= 1) {
    Logger.debug('no actioners - advance play');
    this.advancePlay();
    return;
  }

  this.curBet = 0;

  this.actionPos = this.dealerPos;
  this.lastActionPos = -1;
  this.optionPos = -1;
  this.advanceAction();
  this.optionPos = this.dealerPos;
};

PokerTable.prototype.sitoutLowBal = function() {
  for (var i = 0; i < this.seats.length; ++i) {
    if (this.seats[i]) {
      if (this.seats[i].balance === 0) {
        this.playerSitOut(i);
      }
    }
  }
};

PokerTable.prototype.advancePlay = function() {
  Logger.debug('advance play');

  this.logDebug();

  // Nobody can action right now.
  this.actionPos = -1;
  this.emit('action_moved', this.actionPos, null);

  // If there are no valid moves, just advance play.
  if (this.playersWithOptions() <= 1 && this.playersInHand() > 1) {
    Logger.debug('no seats with options - showdown');
    this.doShowdown();
  }

  this.collectBets(function(){
    if (this.playersInHand() === 1) {
      Logger.debug('only one player remaining - resolve');
      this.completePlay();
      return;
    }

    if (this.communityCards.length < 3) {
      this.dealFlop(function() {
        this.continuePlay();
      }.bind(this));
    } else if (this.communityCards.length < 4) {
      this.dealTurn(function() {
        this.continuePlay();
      }.bind(this));
    } else if (this.communityCards.length < 5) {
      this.dealRiver(function() {
        this.continuePlay();
      }.bind(this));
    } else {
      // Done!
      Logger.debug('end of hand - resolve');
      this.completePlay();
      return;
    }
  }.bind(this));
};

PokerTable.prototype.doShowdown = function() {
  if (this.isShowdown) {
    return;
  }

  this.isShowdown = true;

  Logger.debug('showdown started');

  for (var i = 0; i < this.seats.length; ++i) {
    if (this.playerInHand(i)) {
      var player = this.seats[i];
      this.emit('player_show_hand', i, player.holeCards);
    }
  }
};

var POT_RESOLVE_TIME = 800;

PokerTable.prototype.resolvePot = function(idx, callback) {
  var pot = this.pots[idx];

  if (pot.players.length <= 0) {
    throw new Error('pot with no player attached');
  }

  if (pot.players.length === 1) {
    var playerIdx = pot.players[0];
    var player = this.seats[playerIdx];
    player.balance += pot.amount;
    this.emit('pot_to_player', idx, playerIdx, pot.amount);
  } else {
    var bestHand = null;
    var bestPlayers = [];

    for (var i = 0; i < pot.players.length; ++i) {
      var playerIdx = pot.players[i];
      var player = this.seats[playerIdx];

      var hand = Hand.holdemFromCards(this.communityCards, player.holeCards);
      var cmpVal = Hand.compare(hand, bestHand);
      if (cmpVal > 0) {
        bestHand = hand;
        bestPlayers = [playerIdx];
      } else if (cmpVal === 0) {
        bestPlayers.push(playerIdx);
      }
    }

    var potAmount = Math.floor(pot.amount / bestPlayers.length);
    var potRemain = pot.amount - (potAmount * bestPlayers.length);

    for (var i = 0; i < bestPlayers.length; ++i) {
      var playerIdx = bestPlayers[i];
      var player = this.seats[playerIdx];

      var myPotAmount = potAmount;
      if (i === 0) {
        myPotAmount += potRemain;
      }

      Logger.debug(' ==', player.name, 'wins', myPotAmount, 'of pot', idx, 'with a', bestHand.text());

      player.balance += myPotAmount;
      this.emit('pot_to_player', idx, playerIdx, myPotAmount, POT_RESOLVE_TIME);
    }
  }

  pot.players = [];
  pot.amount = 0;

  setTimeout(callback, POT_RESOLVE_TIME);
};

PokerTable.prototype.resolvePots = function(callback) {
  if (this.pots.length === 0) {
    callback();
    return;
  }

  var potId = 0;
  var resolveOnePot = function() {
    if (potId >= this.pots.length) {
      this.pots = [];
      callback();
      return;
    }
    this.resolvePot(potId++, resolveOnePot);
  }.bind(this);
  this.resolvePot(potId++, resolveOnePot);
};

PokerTable.prototype.completePlay = function() {
  Logger.debug('complete play');

  if (this.playersInHand() > 1) {
    this.doShowdown();
  }

  this.resolvePots(function() {
    setTimeout(function() {
      this.state = 0;

      this.sitoutLowBal();

      this.resetHand();
      this.emit('hand_finished');

      this.tryBeginHand();
    }.bind(this), 1800);
  }.bind(this));
};

PokerTable.prototype.dealCardTo = function(idx) {
  var player = this.seats[idx];
  if (player === null) {
    throw new Error('tried to deal card to empty seat');
  }

  if (player.holeCards.length >= 2) {
    throw new Error('too many hand cards');
  }

  var card = this.deck.pop();
  player.holeCards.push(card);

  this.emit('player_dealt_card', idx, card);
};

PokerTable.prototype.dealHands = function() {
  for (var i = 0; i < this.seats.length; ++i) {
    if (this.playerInHand(i)) {
      this.dealCardTo(i);
    }
  }
  for (var i = 0; i < this.seats.length; ++i) {
    if (this.playerInHand(i)) {
      this.dealCardTo(i);
    }
  }
}

PokerTable.prototype.newDeck = function() {
  this.deck = new Deck();
  this.deck.shuffle();
};








PokerTable.prototype.playerInfo = function(uuid, idx) {
  var player = this.seats[idx];
  if (!player) {
    return null;
  }

  var playerHand = [];
  for (var i = 0; i < player.holeCards.length; ++i) {
    if (player.uuid === uuid) {
      playerHand.push(player.holeCards[i]);
    } else {
      playerHand.push(-1);
    }
  }

  return {
    uuid: player.uuid,
    name: player.name,
    balance: player.balance,
    handBet: player.bet,
    hand: playerHand,
    sittingOut: player.sittingOut,
    myself: uuid === player.uuid
  };
};

PokerTable.prototype.playerInfos = function(uuid) {
  var playerInfos = [];
  for (var i = 0; i < this.seats.length; ++i) {
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
  var myPos = this.getPosFromUuid(uuid);
  var myOptions = null;
  if (myPos !== -1) {
    myOptions = this.actionOpts(myPos);
  }

  return {
    uuid: this.uuid,
    name: this.name,
    dealerPos: this.dealerPos,
    actionPos: this.actionPos,
    actionTimer: this.actionTimerLen ? (this.actionTimerEnd - Date.now()) : 0,
    actionTimerLen: this.actionTimerLen,
    communityCards: this.communityCards,
    pots: this.potInfos(),
    seats: this.playerInfos(uuid),
    myopts: myOptions,

    // TODO: Remove this
    actionOpts: myPos === this.actionPos ? myOptions : null
  };
};








PokerTable.prototype.logDebug = function() {
  // Write out the state of things
  var commText = '';
  for (var i = 0; i < this.communityCards.length; ++i) {
    commText += Card.text(this.communityCards[i]) + ' ';
  }
  Logger.debug('Table State:');
  Logger.debug(' - community :', commText);

  Logger.debug(' - seats');
  for (var i = 0; i < this.seats.length; ++i) {
    if (this.playerInHand(i)) {
      var player = this.seats[i];
      var handText = '';
      for (var j = 0; j < player.holeCards.length; ++j) {
        handText += Card.text(player.holeCards[j]) + ' ';
      }

      var hand = Hand.holdemFromCards(this.communityCards, player.holeCards);
      Logger.debug('   ', i, ':', player.bet, ':', player.name, ':', handText, ':', hand.debugText());
    }
  }

  Logger.debug(' - pots');
  for (var i = 0; i < this.pots.length; ++i) {
    var pot = this.pots[i];
    var potText = '';
    for (var j = 0; j < pot.players.length; ++j) {
      potText += pot.players[j] + ' ';
    }
    Logger.debug('    ', i, ':', pot.amount, ':', potText);
  }
};

module.exports.Table = PokerTable;
module.exports.Player = PokerPlayer;
