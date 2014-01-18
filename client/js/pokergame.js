var stage = null;

var data = {
  images: ['imgs/cards.png'],
  frames: {width:60, height:86},
  framerate: 0
};
var cardSheet = new createjs.SpriteSheet(data);
var cardSpriteIdx = [
  /*      2,  3,  4,  5,  6,  7,  8,  9, 10,  J,  Q,  K,  A */
  /*H*/ [42, 43, 44, 45, 46, 47, 35, 34, 59, 33, 32, 31, 30],
  /*D*/ [18, 19, 20, 21, 22, 23, 11, 10, 57,  9,  8,  7,  6],
  /*C*/ [12, 13, 14, 15, 16, 17,  5,  4, 56,  3,  2,  1,  0],
  /*S*/ [36, 37, 38, 39, 40, 41, 29, 28, 58, 27, 26, 25, 24]
];

createjs.Sound.registerSound("sounds/drawing.wav", "drawing");
createjs.Sound.registerSound("sounds/raise_bet.wav", "raise_bet");
createjs.Sound.registerSound("sounds/raise_more.wav", "raise_more");
createjs.Sound.registerSound("sounds/win.wav", "win");
createjs.Sound.registerSound("sounds/cards_02.wav", "deal_single");

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
  myTable.addChild(panel);
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
  myTable.removeChild(this.panel);
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

  //createjs.Sound.play("deal_single");
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

  betBtnFold.off('btnclicked', actPlayerFold);
  betBtnCall.off('btnclicked', actPlayerCall);
  betBtnCall.off('btnclicked', actPlayerCheck);
  betBtnBet.off('btnclicked', actPlayerBet);
  betBtnBet.off('btnclicked', actPlayerRaise);

  if (opts) {
    if (opts.fold) {
      betBtnFold.on('btnclicked', actPlayerFold);
      betBtnFold.setVisible(true);
    } else {
      betBtnFold.setVisible(false);
    }

    if (opts.check || opts.call) {
      if (opts.check) {
        betBtnCall.setText('Check');
        betBtnCall.setAmount(0);
        betBtnCall.on('btnclicked', actPlayerCheck);
      } else if (opts.call) {
        betBtnCall.setText('Call');
        betBtnCall.setAllInAmount(opts.bet_allin - opts.curbet);
        betBtnCall.setAmount(opts.call);
        betBtnCall.on('btnclicked', actPlayerCall);
      }
      betBtnCall.setVisible(true);
    } else {
      betBtnCall.setVisible(false);
    }

    if (opts.bet || opts.raise) {
      if (opts.bet) {
        betBtnBet.setText('Bet');
        betBtnBet.on('btnclicked', actPlayerBet);
      } else if (opts.raise) {
        betBtnBet.setText('Raise');
        betBtnBet.on('btnclicked', actPlayerRaise);
      }

      if (opts.bet_min !== opts.bet_max) {
        betSlider.setRange(opts.bet_min, opts.bet_max);
        betSlider.setVisible(true);
      } else {
        betSlider.setRange(null, null);
        betSlider.setVisible(false);
      }

      betBtnBet.setAllInAmount(opts.bet_allin);
      betSlider.setAllInAmount(opts.bet_allin);
      betBtnBet.setAmount(opts.bet_min);
      betSlider.setValue(opts.bet_min);

      betBtnBet.setVisible(true);
    } else {
      betBtnBet.setVisible(false);
      betSlider.setVisible(false);
    }

    betPanel.visible = true;
  } else {
    betPanel.visible = false;
  }
}

function playerFold(pos) {
  playerPanels[pos].setCards(null);
}

function actPlayerFold() {
  console.log('FOLD');
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
  var amount = betSlider.getValue();
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
  [{x:1400, y:550}, {x:950,y:700}, {x:570,y:550}, {x:950,y:300}]
];
var playerBets = [];
var playerBetAmts = [];
function setPlayerBet(pos, bet) {
  if (!playerBets[pos]) {
    var myPos = betPos[maxPlayers][pos];

    var stack = new ChipStack(myPos.x, myPos.y, 0);
    playerBets[pos] = stack;
    playerBetAmts[pos] = 0;
  }

  if (bet > 0) {
    playerBetAmts[pos] = bet;
    playerBets[pos].setSize(bet);
    playerBets[pos].setVisible(true);
  } else {
    playerBets[pos].setVisible(false);
  }
}

var potAmounts = [];
var mainPot = null;
var sidePot = null;
function resetPots() {
  potAmounts = [];

  if (!mainPot) {
    mainPot = new ChipStack(800, 640, 0);
  }
  if (!sidePot) {
    sidePot = new ChipStack(1150, 640, 0);
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
    mainPot.setSize(mainPotAmt);
    mainPot.setVisible(true);
  } else {
    mainPot.setVisible(false);
  }

  if (sidePotAmt > 0) {
    sidePot.setSize(sidePotAmt);
    sidePot.setVisible(true);
  } else {
    sidePot.setVisible(false);
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
  card.x = 680 + i * (65 * 1.8);
  card.y = 390;
  card.scaleX = 1.8;
  card.scaleY = 1.8;
  myTable.addChild(card);
  commCards.push(card);

  //createjs.Sound.play("deal_single");
}

function setCommCards(cards) {
  for (var i = 0; i < commCards.length; ++i) {
    myTable.removeChild(commCards[i]);
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
  [{x:770*2, y:225*2}, {x:600*2,y:440*2}, {x:127*2,y:340*2}, {x:360*2,y:120*2}]
];
var dealChip = null;
function setDealerPos(pos) {
  if (!dealChip) {
    dealChip = new createjs.Sprite(chipSheet, 0);
    dealChip.gotoAndStop(6);
    myTable.addChild(dealChip);
  }

  if (pos !== -1) {
    var newPos = dealChipPos[maxPlayers][pos];
    dealChip.x = newPos.x;
    dealChip.y = newPos.y;
    dealChip.visible = true;
  } else {
    dealChip.visible = false;
  }

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

var datac = {
  images: ['imgs/chips.png'],
  frames: {width:50, height:50, regX: 23, regY: 28},
  framerate: 0
};
var chipSheet = new createjs.SpriteSheet(datac);

function ChipStack(x, y, size) {
  this.x = x;
  this.y = y;
  this.stackGroup = null;

  this.setSize(size);
}

ChipStack.prototype.setVisible = function(vis) {
  if (this.stackGroup) {
    this.stackGroup.visible = vis;
  }
};

ChipStack.prototype.setSize = function(size) {
  if (this.stackGroup) {
    myTable.removeChild(this.stackGroup);
    this.stackGroup = null;
  }

  if (size === 0) {
    return;
  }

  var chipImgId = [3, 0, 4, 3, 2, 1, 0, 4, 3, 2, 1, 0];
  var chipTextColor = [
                                     '#000000', '#000000',
    '#000000', '#000000', '#ffffff', '#ffffff', '#000000',
    '#000000', '#000000', '#ffffff', '#ffffff', '#000000']
  var chipSizes = [25000000, 5000000, 1000000, 250000, 100000, 25000, 5000, 1000, 100, 25, 5, 1];
  var chipNames = ['25m', '5m', '1m', '250k', '100k', '25k', '5k', '1k', '100', '25', '5', '1'];
  var chipCounts = [];
  var bigCol = 0;

  var sizeLeft = size;
  for (var i = 0; i < chipSizes.length; ++i) {
    var thisSize = chipSizes[i];
    var thisCount = Math.floor(sizeLeft / thisSize);
    if (thisCount > 0) {
      chipCounts.push([i, thisCount]);

      if (thisCount > bigCol) {
        bigCol = thisCount;
      }
    }
    sizeLeft -= thisCount * thisSize;
  }

  var grp = new createjs.Container();
  grp.x = this.x;
  grp.y = this.y;
  grp.visible = false;
  myTable.addChild(grp);
  this.stackGroup = grp;

  var wrap = new createjs.Container();
  this.stackGroup.addChild(wrap);

  var sizeText = new createjs.Text('$' + size, "24px Arial", '#ffffff');
  sizeText.x = 0;
  sizeText.y = 24;
  sizeText.textAlign = 'center';
  sizeText.textBaseline = 'top';
  grp.addChild(sizeText);

  var chipWidth = 46;
  var chipHeight = 6;

  var posX = 0;
  for (var i = 0; i < chipCounts.length; ++i) {
    var colSize = 0;
    var posY = 0;
    while (true) {
      var chipInfo = chipCounts[i];

      for (var j = 0; j < chipInfo[1]; ++j) {
        var chipId = chipImgId[chipInfo[0]];

        var sp = new createjs.Sprite(chipSheet, 0);
        sp.x = posX;
        sp.y = posY;
        sp.gotoAndStop(chipId);
        wrap.addChild(sp);
        posY -= chipHeight;
      }

      colSize += chipInfo[1];

      if (chipCounts.length < 3) {
        break;
      } else if (colSize > bigCol * 0.8) {
        break;
      } else if (i + 1 >= chipCounts.length) {
        break;
      }

      i++;
    }

    var stackText = new createjs.Text(chipNames[chipInfo[0]], "18px Tahoma", chipTextColor[chipInfo[0]]);
    stackText.x = posX;
    stackText.y = posY;
    stackText.textAlign = 'center';
    stackText.textBaseline = 'middle';
    wrap.addChild(stackText);

    posX += chipWidth;
  }

  wrap.x = (-posX+chipWidth) / 2;
};

var maxPlayers = 0;
function startGame(info) {
  maxPlayers = info.seats.length;

  for (var i = 0; i < playerPanels.length; ++i) {
    playerPanels[i].remove();
    setPlayerBet(i, 0);
  }

  playerBets = [];
  playerPanels = [];

  if (maxPlayers !== 4) {
    throw new Error('invalid max seats');
  }

  // Create all the panels
  for (var i = 0; i < maxPlayers; ++i) {
    var thisPos = playerPanelPos[maxPlayers][i];
    var panel = new PlayerPanel(i, thisPos.x, thisPos.y);
    playerPanels.push(panel);
    playerBets.push(null);
  }

  setPots(info.pots);
  setCommCards(info.communityCards);

  for (var i = 0; i < maxPlayers; ++i) {
    var panel = playerPanels[i];

    panel.setInfo(info.seats[i]);
    if (info.seats[i]) {
      setPlayerBet(i, info.seats[i].bet);
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

function BetButton(normal, over, down, text, amt, textFmt, textColor, textX, textY) {
  var wrap = new createjs.Container();
  this.wrap = wrap;

  this.text = text;
  this.amount = amt;
  this.allInAmount = -1;

  var imgNormal = new createjs.Bitmap(normal);
  this.wrap.addChild(imgNormal);
  this.stateNormal = imgNormal;

  if (over) {
    var imgOver = new createjs.Bitmap(over);
    imgOver.visible = false;
    this.wrap.addChild(imgOver);
    this.stateOver = imgOver;
  } else {
    this.stateOver = this.stateNormal;
  }

  if (down) {
    var imgDown = new createjs.Bitmap(down);
    imgDown.visible = false;
    this.wrap.addChild(imgDown);
    this.stateDown = imgDown;
  } else {
    this.stateDown = this.stateNormal;
  }

  if (text) {
    var txtText = new createjs.Text(text, textFmt, textColor);
    txtText.x = textX;
    txtText.y = textY;
    txtText.textAlign = 'center';
    txtText.textBaseline = 'middle';
    this.wrap.addChild(txtText);
    this.txtText = txtText;
  }

  this.isDown = false;
  this.isOver = false;
  this.wrap.addEventListener('rollover', function() {
    this.isOver = true;
    this.updateState();
  }.bind(this));
  this.wrap.addEventListener('rollout', function() {
    this.isOver = false;
    this.updateState();
  }.bind(this));
  this.wrap.addEventListener('mousedown', function() {
    this.isDown = true;
    this.updateState();
  }.bind(this));
  this.wrap.addEventListener('pressup', function(e) {
    if (this.isOver) {
      this.wrap.dispatchEvent('btnclicked');
    }
    this.isDown = false;
    this.updateState();
  }.bind(this));
}
BetButton.prototype.updateState = function() {
  this.stateNormal.visible = false;
  this.stateOver.visible = false;
  this.stateDown.visible = false;

  if (this.isDown) {
    this.stateDown.visible = true;
  } else if (this.isOver) {
    this.stateOver.visible = true;
  } else {
    this.stateNormal.visible = true;
  }
};
BetButton.prototype.setPosition = function(x, y) {
  this.wrap.x = x;
  this.wrap.y = y;
};
BetButton.prototype.updateButtonText = function() {
  if (this.amount) {
    if (this.amount === this.allInAmount) {
      this.txtText.text = this.text + ' ALL-IN';
    } else {
      this.txtText.text = this.text + ' $' + this.amount;
    }
  } else {
    this.txtText.text = this.text;
  }
};
BetButton.prototype.setText = function(text) {
  this.text = text;
  this.updateButtonText();
};
BetButton.prototype.setAmount = function(amt) {
  this.amount = amt;
  this.updateButtonText();
};
BetButton.prototype.setAllInAmount = function(amt) {
  this.allInAmount = amt;
};
BetButton.prototype.addTo = function(parent) {
  parent.addChild(this.wrap);
};
BetButton.prototype.removeFrom = function(parent) {
  parent.removeChild(this.wrap);
};
BetButton.prototype.on = function(evt, cb) {
  this.wrap.addEventListener(evt, cb);
};
BetButton.prototype.off = function(evt, cb) {
  this.wrap.removeEventListener(evt, cb);
};
BetButton.prototype.setVisible = function(val) {
  this.wrap.visible = val;
}

function BetSlider() {
  this.sliderMin = 62;
  this.sliderLen = 320;
  this.valueMin = 0;
  this.valueMax = 0;
  this.value = 0;
  this.allInAmount = -1;

  this.onValueChanged = null;

  var wrap = new createjs.Container();
  this.wrap = wrap;

  var betSliderBase = new createjs.Bitmap('imgs/betSlider.png');
  this.wrap.addChild(betSliderBase);
  this.betSliderBase = betSliderBase;

  var betSliderIn = new createjs.Bitmap('imgs/betSliderInner.png');
  betSliderIn.x = 62;
  betSliderIn.y = 21;
  betSliderIn.scaleX = 0;
  this.wrap.addChild(betSliderIn);
  this.betSliderIn = betSliderIn;

  var betSliderPos = new createjs.Bitmap('imgs/betSliderPos.png');
  betSliderPos.regX = 11;
  betSliderPos.regY = 12;
  betSliderPos.x = this.sliderMin;
  betSliderPos.y = 23;
  this.wrap.addChild(betSliderPos);
  this.betSliderPos = betSliderPos;

  var text = new createjs.Text('$999,999', '18px Calibri', '#ffffff');
  text.x = 452;
  text.y = 24;
  text.textAlign = 'center';
  text.textBaseline = 'middle';
  this.wrap.addChild(text);
  this.txtText = text;

  this.isDown = true;
  this.offsetX = 0;
  betSliderPos.addEventListener('mousedown', function(e) {
    this.offsetX = e.stageX - betSliderPos.x;
    this.isDown = true;
  }.bind(this));
  betSliderPos.addEventListener('pressmove', function(e) {
    betSliderPos.x = e.stageX - this.offsetX;

    if (betSliderPos.x < this.sliderMin) {
      betSliderPos.x = this.sliderMin;
    } else if (betSliderPos.x > this.sliderMin + this.sliderLen) {
      betSliderPos.x = this.sliderMin + this.sliderLen;
    }

    var perc = ( betSliderPos.x - this.sliderMin ) / this.sliderLen;
    this.value = Math.round(perc * (this.valueMax - this.valueMin)) + this.valueMin;
    this.updatedValue();

    //betSliderIn.scaleX =
  }.bind(this));

  this.wrap.addEventListener('click', function(e) {
    var localX = this.wrap.globalToLocal(e.stageX, e.stageY).x;

    console.log(localX);
    if (localX < this.sliderMin) {
      return;
    }
    if (localX > this.sliderMin + this.sliderLen) {
      return;
    }

    var tickAmount = Math.ceil((this.valueMax - this.valueMin) * 0.05);
    if (localX < betSliderPos.x) {
      this.setValue(this.value - tickAmount);
    } else if (localX > betSliderPos.x) {
      this.setValue(this.value + tickAmount);
    }
  }.bind(this));
};
BetSlider.prototype.updatedValue = function() {
  var perc = (this.value - this.valueMin) / (this.valueMax - this.valueMin);
  this.betSliderPos.x = this.sliderMin + perc * this.sliderLen;
  this.betSliderIn.scaleX = perc;

  if (this.value === this.allInAmount) {
    this.txtText.text = 'ALL-IN';
  } else {
    this.txtText.text = '$' + this.value;
  }

  if (this.onValueChanged) {
    this.onValueChanged(this.value);
  }
};
BetSlider.prototype.setPosition = function(x, y) {
  this.wrap.x = x;
  this.wrap.y = y;
};
BetSlider.prototype.setRange = function(min, max) {
  this.valueMin = min;
  this.valueMax = max;
};
BetSlider.prototype.setValue = function(val) {
  if (this.valueMin !== null && val < this.valueMin) {
    val = this.valueMin;
  } else if (this.valueMax !== null && val > this.valueMax) {
    val = this.valueMax;
  }

  this.value = val;
  this.updatedValue();
};
BetSlider.prototype.setAllInAmount = function(val) {
  this.allInAmount = val;
};
BetSlider.prototype.getValue = function() {
  return this.value;
};
BetSlider.prototype.addTo = function(parent) {
  parent.addChild(this.wrap);
};
BetSlider.prototype.removeFrom = function(parent) {
  parent.removeChild(this.wrap);
};
BetSlider.prototype.setVisible = function(val) {
  this.wrap.visible = val;
}

var myUi = null;
var myTable = null;

var betPanel = null;
var betBtnFold = null;
var betBtnCall = null;
var betBtnBet = null;
var betSlider = null;

function initGame() {
  stage.enableMouseOver();

  myUi = new createjs.Container();
  stage.addChild(myUi);

  var roomBg = new createjs.Bitmap('imgs/roomBg.png');
  myUi.addChild(roomBg);

  var roomStatus = new createjs.Bitmap('imgs/roomStatusGreen.png');
  roomStatus.regX = 19;
  roomStatus.regY = 19;
  roomStatus.x = 26;
  roomStatus.y = 24;
  myUi.addChild(roomStatus);

  betPanel = new createjs.Container();
  betPanel.x = 454;
  betPanel.y = 599;
  betPanel.visible = false;
  myUi.addChild(betPanel);

  betBtnFold = new BetButton(
    'imgs/btnFold.png',
    'imgs/btnFoldOver.png',
    'imgs/btnFoldDown.png',
    'Fold', 0, '18px Calibri', '#ffffff', 77, 24
  );
  betBtnFold.setPosition(8, 12);
  betBtnFold.addTo(betPanel);

  betBtnCall = new BetButton(
    'imgs/btnCall.png',
    'imgs/btnCallOver.png',
    'imgs/btnCallDown.png',
    'Call', 0, '18px Calibri', '#ffffff', 77, 24
  );
  betBtnCall.setPosition(187, 12);
  betBtnCall.addTo(betPanel);

  betBtnBet = new BetButton(
    'imgs/btnBet.png',
    'imgs/btnBetOver.png',
    'imgs/btnBetDown.png',
    'Bet', 0, '18px Calibri', '#ffffff', 77, 24
  );
  betBtnBet.setPosition(364, 12);
  betBtnBet.addTo(betPanel);

  betSlider = new BetSlider();
  betSlider.setPosition(6, 101);
  betSlider.setRange(100, 110);
  betSlider.setValue(110);
  betSlider.addTo(betPanel);

  betSlider.onValueChanged = function(value) {
    betBtnBet.setAmount(value);
  };


  myTable = new createjs.Container();
  myTable.x = 16;
  myTable.y = 48;
  myTable.scaleX = 0.5;
  myTable.scaleY = 0.5;
  stage.addChild(myTable);

  var tableBg = new createjs.Bitmap('imgs/table.png');
  myTable.addChild(tableBg);

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

  $('#standup').click(actPlayerStandUp);
  $('#sitin').click(actPlayerSitIn);
  $('#sitout').click(actPlayerSitOut);

  stage = new createjs.Stage('gamearea');

  createjs.Ticker.addEventListener('tick', function(e) {
    stage.update(e);
  });

  initGame();
});