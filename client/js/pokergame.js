var stage = null;

var data = {
  images: ['imgs/cards.png'],
  frames: {width:60, height:86},
  framerate: 0,
  snapToPixel: true
};
var cardSheet = new createjs.SpriteSheet(data);
var cardSpriteIdx = [
  /*      2,  3,  4,  5,  6,  7,  8,  9, 10,  J,  Q,  K,  A */
  /*H*/ [42, 43, 44, 45, 46, 47, 35, 34, 59, 33, 32, 31, 30],
  /*D*/ [18, 19, 20, 21, 22, 23, 11, 10, 57,  9,  8,  7,  6],
  /*C*/ [12, 13, 14, 15, 16, 17,  5,  4, 56,  3,  2,  1,  0],
  /*S*/ [36, 37, 38, 39, 40, 41, 29, 28, 58, 27, 26, 25, 24]
];

function cardSuit(idx) {
  return Math.floor(idx/13);
}
function cardNum(idx) {
  return idx % 13;
}
function cardSprite(idx) {
  var card = new createjs.Sprite(cardSheet);
  card.gotoAndStop(cardSpriteIdx[cardSuit(idx)][cardNum(idx)]);
  return card;
}
function cardBackSprite() {
  var card = new createjs.Sprite(cardSheet);
  card.gotoAndStop(49);
  return card;
}

var myinfo = window.location.hash.split('#');
var myname = 'default_' + Math.floor(Math.random()*10000);
if (myinfo.length >= 2) {
  myname = myinfo[1];
}

function PlayerPanel(pos, x, y) {
  this.pos = pos;
  this.info = null;
  this.used = false;
  this.balance = 0;
  this.sittingOut = false;

  var panel = new createjs.Container();
  panel.x = x;
  panel.y = y;
  stage.addChild(panel);
  this.panel = panel;

  var panelBg = new createjs.Bitmap('imgs/playerPanel.png');
  panel.addChild(panelBg);

  var emptyPanel = new createjs.Container();
  emptyPanel.visible = false;
  panel.addChild(emptyPanel);
  this.emptyPanel = emptyPanel;

  var self = this;
  panel.on('click', function() {
    if (!self.used) {
      sitDownAt(self.pos);
    }
  });

  var text = new createjs.Text("Sit Here", "40px Arial", "#ffffff");
  text.x = 20;
  text.y = 146 / 2;
  text.textBaseline = 'middle';
  emptyPanel.addChild(text);

  var usedPanel = new createjs.Container();
  usedPanel.visible = true;
  panel.addChild(usedPanel);
  this.usedPanel = usedPanel;

  var panelHi = new createjs.Bitmap('imgs/playerPanelHi.png');
  panelHi.x = -50;
  panelHi.y = -50;
  panelHi.visible = false;
  usedPanel.addChild(panelHi);
  this.panelHi = panelHi;

  var text = new createjs.Text("", "35px Arial", "#ffffff");
  text.x = 20;
  text.y = 40;
  text.textBaseline = 'top';
  usedPanel.addChild(text);
  this.playerName = text;

  var textb = new createjs.Text("$0.00", "25px Arial", "#ffffff");
  textb.x = 20;
  textb.y = 146 - 20;
  textb.textBaseline = 'bottom';
  usedPanel.addChild(textb);
  this.playerBalance = textb;

  var timer = new createjs.Shape();
  usedPanel.addChild(timer);
  this.timerShape = timer;

  this.myTimer = null;
  this.timerStart = 0;
  this.timerLen = 0;

  this.handCards = [];
}

var myPos = -1;
function setMyPosition(pos) {
  console.log('my position - ', pos);
  myPos = pos;

  if (myPos === -1) {
    $('#xact_form').hide();
  } else {
    $('#xact_form').show();

    var myPanel = playerPanels[myPos];
    if (myPanel.sittingOut) {
      $('#sitout').attr('disabled', true);
      $('#sitin').attr('disabled', false);
    } else {
      $('#sitout').attr('disabled', false);
      $('#sitin').attr('disabled', true);
    }
  }
}

PlayerPanel.prototype.remove = function() {
  stage.removeChild(this.panel);
};

PlayerPanel.prototype.reset = function() {
  this.setCards(null);
};

PlayerPanel.prototype.setInfo = function(info) {
  if (info && info.myself) {
    setMyPosition(this.pos);
  }
  if (!info && this.isMyself) {
    setMyPosition(-1);
  }

  if (info) {
    this.isMyself = info.myself;

    this.setName(info.name);
    this.setSittingOut(info.sittingOut);
    this.setCards(info.hand);
    this.setBalance(info.balance);

    this.used = true;
    this.emptyPanel.visible = false;
    this.usedPanel.visible = true;
  } else {
    this.isMyself = false;
    this.used = false;
    this.emptyPanel.visible = true;
    this.usedPanel.visible = false;
  }
};

PlayerPanel.prototype.updateTimer = function() {
  var elapsed = Date.now() - this.timerStart;
  if (elapsed >= this.timerLen) {
    elapsed = this.timerLen;
  }

  var perc = elapsed / this.timerLen;

  var widthperc = 1 - perc;
  var colorx = Math.floor(512 * perc) - 127;
  if (colorx < 0) colorx = 0;
  if (colorx > 255) colorx = 255;

  var gfx = this.timerShape.graphics;
  gfx.clear();
  gfx.beginFill('rgba('+colorx+','+(255-colorx)+',0,1.0)');
  gfx.drawRoundRect(8, 136, 240 * widthperc, 4, 2);
};

PlayerPanel.prototype.clearTimer = function() {
  if (this.myTimer) {
    clearInterval(this.myTimer);
    this.myTimer = null;
  }

  this.timerShape.graphics.clear();
};

PlayerPanel.prototype.startTimer = function(ms, timerLen) {
  this.clearTimer();

  console.log('starttime', ms, timerLen);

  this.timerStart = Date.now() - timerLen + ms;
  this.timerLen = timerLen;

  this.updateTimer();
  this.myTimer = setInterval(function() {
    this.updateTimer();
  }.bind(this), 100);
};

PlayerPanel.prototype.setName = function(name) {
  this.playerName.text = name;
};

PlayerPanel.prototype.setBalance = function(balance) {
  this.balance = balance;

  if (this.sittingOut && this.handCards.length === 0) {
    this.playerBalance.text = 'SITTING OUT';
    this.playerBalance.color = '#888888';
  } else if (balance > 0 || this.handCards.length === 0) {
    this.playerBalance.text = '$' + balance;
    this.playerBalance.color = '#ffffff';
  } else {
    this.playerBalance.text = 'ALL-IN';
    this.playerBalance.color = '#ff0000';
  }
};
PlayerPanel.prototype.addBalance = function(amount) {
  this.setBalance(this.balance + amount);
};

PlayerPanel.prototype.setCards = function(hand) {
  while (this.handCards.length > 0) {
    var card = this.handCards.shift();
    this.usedPanel.removeChild(card);
  }

  if (!hand) {
    this.addBalance(0);
    return;
  }

  for (var i = 0; i < hand.length; ++i) {
    this.dealCard(hand[i]);
  }

  // For updating the ALL-IN text.
  this.addBalance(0);
};

PlayerPanel.prototype.dealCard = function(card) {
  var i = this.handCards.length;

  var card = card < 0 ? cardBackSprite() : cardSprite(card);
  card.x = 180 + (i * -65);
  card.y = -50;
  this.usedPanel.addChild(card);
  this.handCards.push(card);
};

PlayerPanel.prototype.setActionOnMe = function(isit) {
  if (isit) {
    this.panelHi.visible = true;
  } else {
    //this.clearTimer();
    this.panelHi.visible = false;
  }
};

PlayerPanel.prototype.setSittingOut = function(sitout) {
  this.sittingOut = sitout;

  // Update balance text substitutions
  this.addBalance(0);

  // Update xact form stuff
  setMyPosition(myPos);
};

function sitDownAt(pos) {
  primus.write(['sit_down', {pos: pos}]);
}

function setActionPos(pos, timer, timerLen, opts) {
  for (var i = 0; i < maxPlayers; ++i) {
    playerPanels[i].setActionOnMe(i === pos);
    playerPanels[i].clearTimer();
  }

  if (pos !== -1) {
    playerPanels[pos].startTimer(timer, timerLen);
  }

  if (opts) {
    $('#fold').attr('disabled', !opts.fold);
    $('#check').attr('disabled', !opts.check);
    $('#call').attr('disabled', !opts.call);
    $('#bet').attr('disabled', !opts.bet);
    $('#raise').attr('disabled', !opts.raise);
    $('#bet_amount').attr('disabled', !opts.bet && !opts.raise);
    $('#bet_amount').val(opts.bet_min);
    $('#bet_range').text('($' + opts.bet_min + ' - $' + opts.bet_max + ')');

    $('#act_form').show();
  } else {
    $('#act_form').hide();
  }
}

function playerFold(pos) {
  playerPanels[pos].setCards(null);
}

function actPlayerFold() {
  primus.write(['act_fold', {}]);
  return false;
}
function actPlayerCheck() {
  primus.write(['act_check', {}]);
  return false;
}
function actPlayerCall() {
  primus.write(['act_call', {}]);
  return false;
}
function _actPlayerBet(type) {
  var amount = parseInt($('#bet_amount').val());
  if (type === 'bet') {
    primus.write(['act_bet', {amount: amount}]);
  } else if (type === 'raise') {
    primus.write(['act_raise', {amount: amount}]);
  }
}
function actPlayerBet() {
  _actPlayerBet('bet');
  return false;
}
function actPlayerRaise() {
  _actPlayerBet('raise');
  return false;
}

function actPlayerStandUp() {
  primus.write(['act_standup', {}]);
}

function actPlayerSitIn() {
  primus.write(['act_sitin', {}]);
}
function actPlayerSitOut() {
  primus.write(['act_sitout', {}]);
}

var betPos = [
  null,
  null,
  [{x:0,y:0},{x:0,y:0}],
  [{x:0,y:0},{x:0,y:0},{x:0,y:0}],
  [{x:1200, y:550}, {x:950,y:700}, {x:520,y:550}, {x:950,y:270}]
];
var playerBets = [];
var playerBetAmts = [];
function setPlayerBet(pos, bet) {
  if (!playerBets[pos]) {
    var myPos = betPos[maxPlayers][pos];
    var text = new createjs.Text("", "40px Arial", "#ffffff");
    text.x = myPos.x;
    text.y = myPos.y;
    text.textAlign = 'center';
    text.textBaseline = 'middle';
    stage.addChild(text);
    playerBets[pos] = text;
    playerBetAmts[pos] = 0;
  }

  if (bet > 0) {
    playerBetAmts[pos] = bet;
    playerBets[pos].text = '$' + bet;
    playerBets[pos].visible = true;
  } else {
    playerBets[pos].visible = false;
  }
}

var potAmounts = [];
var mainPot = null;
var sidePot = null;
function resetPots() {
  potAmounts = [];

  if (!mainPot) {
    var text = new createjs.Text("", "40px Arial", "#ffffff");
    text.x = 660;
    text.y = 600;
    text.textAlign = 'center';
    text.textBaseline = 'middle';
    text.visible = false;
    stage.addChild(text);
    mainPot = text;
  }
  if (!sidePot) {
    var text = new createjs.Text("", "40px Arial", "#ffffff");
    text.x = 860;
    text.y = 600;
    text.textAlign = 'center';
    text.textBaseline = 'middle';
    text.visible = false;
    stage.addChild(text);
    sidePot = text;
  }

  _updatePotText();
}

function _updatePotText() {
  var mainPotAmt = 0;
  var sidePotAmt = 0;
  for (var i = 0; i < potAmounts.length; ++i) {
    if (i === 0) {
      mainPotAmt += potAmounts[i];
    } else {
      sidePotAmt += potAmounts[i];
    }
  }

  if (mainPotAmt > 0) {
    mainPot.text = '$' + mainPotAmt;
    mainPot.visible = true;
  } else {
    mainPot.visible = false;
  }

  if (sidePotAmt > 0) {
    sidePot.text = '$' + sidePotAmt;
    sidePot.visible = true;
  } else {
    sidePot.visible = false;
  }
}

function moveToPot(pos, pot, amount) {
  if (!potAmounts[pot]) {
    potAmounts[pot] = 0;
  }

  potAmounts[pot] += amount;
  setPlayerBet(pos, playerBetAmts[pos] - amount);

  _updatePotText();
}

function moveFromPot(pot, pos, amount) {
  if (!potAmounts[pot]) {
    potAmounts[pot] = 0;
  }

  potAmounts[pot] -= amount;
  playerPanels[pos].addBalance(amount);

  _updatePotText();
}

function setPots(pots) {
  resetPots();

  if (!pots) {
    return;
  }

  for (var i = 0; i < pots.length; ++i) {
    potAmounts.push(pots[i]);
  }
  _updatePotText();
}

var commCards = [];
function dealCommCard(card) {
  var i = this.commCards.length;

  // Note that setCommCards uses this, and this should be animating,
  //   but setCommCards should not be, so split when that happens.
  var card = cardSprite(card);
  card.x = 800 + i * 65;
  card.y = 400;
  stage.addChild(card);
  commCards.push(card);
}

function setCommCards(cards) {
  for (var i = 0; i < commCards.length; ++i) {
    stage.removeChild(commCards[i]);
  }
  commCards = [];

  if (!cards) {
    return;
  }

  for (var i = 0; i < cards.length; ++i) {
    dealCommCard(cards[i]);
  }
}

var dealChipPos = [
  null,
  null,
  [{x:0,y:0},{x:0,y:0}],
  [{x:0,y:0},{x:0,y:0},{x:0,y:0}],
  [{x:718*2, y:193*2}, {x:549*2,y:378*2}, {x:147*2,y:330*2}, {x:318*2,y:112*2}]
];
var dealChip = null;
function setDealerPos(pos) {
  if (!dealChip) {
    dealChip = new createjs.Text("D", "40px Arial", "#dddddd");
    dealChip.textAlign = 'center';
    dealChip.textBaseline = 'middle';
    stage.addChild(dealChip);
  }

  var newPos = dealChipPos[maxPlayers][pos];
  dealChip.x = newPos.x;
  dealChip.y = newPos.y;
}

var playerPanels = [];
var playerPanelPos = [
  null,
  null,
  [{x:0,y:0},{x:0,y:0}],
  [{x:0,y:0},{x:0,y:0},{x:0,y:0}],
  [{x:1493, y:483}, {x:766,y:891}, {x:25,y:483}, {x:766,y:60}]
];

function resetHand() {
  setCommCards(null);
  setPots(null);
  for (var i = 0; i < playerPanels.length; ++i) {
    playerPanels[i].reset();
    setPlayerBet(i, 0);
  }
}

var maxPlayers = 0;
function startGame(info) {
  maxPlayers = info.maxPlayers;

  for (var i = 0; i < playerPanels.length; ++i) {
    playerPanels[i].remove();
    setPlayerBet(i, 0);
  }

  playerBets = [];
  playerPanels = [];

  if (maxPlayers !== 4) {
    throw new Error('invalid max players');
  }

  // Create all the panels
  for (var i = 0; i < maxPlayers; ++i) {
    var thisPos = playerPanelPos[maxPlayers][i];
    var panel = new PlayerPanel(i, thisPos.x, thisPos.y);
    playerPanels.push(panel);
    playerBets.push(null);
  }

  setPots(info.pots);
  setCommCards(info.community);

  for (var i = 0; i < maxPlayers; ++i) {
    var panel = playerPanels[i];

    panel.setInfo(info.players[i]);
    if (info.players[i]) {
      setPlayerBet(i, info.players[i].handBet);
    } else {
      setPlayerBet(i, 0);
    }
  }

  setDealerPos(info.dealerPos);
  setActionPos(info.actionPos, info.actionTimer, info.actionTimerLen, info.actionOpts);
}

var primus = new Primus('/');
primus.on('open', function() {
  console.log('connected!');
  primus.write(['login', {
    'name': myname
  }]);
});
primus.on('data', function(data) {
  console.log(data);
  var cmd = data[0];
  var info = data[1];

  if (cmd === 'open_table') {
    startGame(info);
  } else if(cmd === 'player_sat') {
    playerPanels[info.pos].setInfo(info.info);
  } else if(cmd === 'player_deal_card') {
    playerPanels[info.pos].dealCard(info.card);
  } else if(cmd === 'player_set_balance') {
    playerPanels[info.pos].setBalance(info.balance);
  } else if(cmd === 'player_set_bet') {
    setPlayerBet(info.pos, info.bet);
  } else if (cmd === 'player_fold') {
    playerFold(info.pos);
  } else if(cmd === 'set_dealer') {
    setDealerPos(info.pos);
  } else if(cmd === 'set_action') {
    setActionPos(info.pos, info.timer, info.timer, info.opts);
  } else if(cmd === 'community_deal_card') {
    dealCommCard(info.card);
  } else if (cmd === 'player_to_pot') {
    moveToPot(info.pos, info.pot, info.amount);
  } else if (cmd === 'pot_to_player') {
    moveFromPot(info.pot, info.pos, info.amount);
  } else if (cmd === 'hand_finished') {
    resetHand();
  } else if (cmd === 'player_show_hand') {
    playerPanels[info.pos].setCards(info.hand);
  } else if (cmd === 'player_stood') {
    playerPanels[info.pos].setInfo(null);
  } else if (cmd === 'player_satin') {
    playerPanels[info.pos].setSittingOut(false);
  } else if (cmd === 'player_satout') {
    playerPanels[info.pos].setSittingOut(true);
  }

});

function initGame() {
  var table = new createjs.Bitmap('imgs/table.png');
  stage.addChild(table);

  /* Test Community Cards
  for (var i = 0; i < 5; ++i) {
    dealCommCard(5 + i);
  }
  //*/

  /* Card Tiles
  for (var i = 0; i < 52; ++i) {
    var card = cardSprite(i);
    card.x = 480 + cardNum(i) * (70+5);
    card.y = 350 + cardSuit(i) * (95+5)
    stage.addChild(card);
  }
  //*/
}

$(document).ready(function(){
  $('#act_form').hide();
  $('#xact_form').hide();

  $('#fold').click(actPlayerFold);
  $('#check').click(actPlayerCheck);
  $('#call').click(actPlayerCall);
  $('#bet').click(actPlayerBet);
  $('#raise').click(actPlayerRaise);
  $('#standup').click(actPlayerStandUp);
  $('#sitin').click(actPlayerSitIn);
  $('#sitout').click(actPlayerSitOut);

  stage = new createjs.Stage('gamearea');
  stage.scaleX = 0.5;
  stage.scaleY = 0.5;

  createjs.Ticker.addEventListener('tick', function(e) {
    stage.update(e);
  });

  initGame();
});