var BET_POSITION = [
  null, null,
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [[536, 180], [640, 190], [680, 280], [644, 370], [536, 425],
    [424, 425], [320, 370], [290, 280], [320, 190], [424, 180]]
];

var PLRBAL_POSITION = [
  null, null,
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [[575, 64], [728, 142], [760, 250], [730, 360], [580, 440],
    [285, 440], [140, 360], [96, 250], [135, 145], [290, 65]]
];

var MAINPOT_POSITION = [420, 350];
var SIDEPOT_POSITION = [540, 350];

function StackManager() {
  this.betStacks = null;
  this.chipPos = null;
  this.mainPot = null;
  this.sidePot = null;
}

StackManager.prototype.setSeatCount = function(seatCount) {
  this.betStacks = [];
  for (var i = 0; i < seatCount; ++i) {
    this.betStacks.push(null);
  }
  this.chipPos = BET_POSITION[seatCount];
  this.seatPos = PLRBAL_POSITION[seatCount];
};

StackManager.prototype.setSeatBet = function(seatIdx, amount) {
  if (this.betStacks[seatIdx]) {
    this.betStacks[seatIdx].remove();
    this.betStacks[seatIdx] = null;
  }

  if (amount <= 0) {
    return;
  }

  var stackPos = this.chipPos[seatIdx];
  var stack = new PokerChipStack(CHIP_TYPE, amount);
  stack.setPosition(stackPos[0], stackPos[1]);
  this.betStacks[seatIdx] = stack;
};

StackManager.prototype._splitStack = function(stack, amount) {
  console.log('splitting pot', stack.amount, amount);
  if (stack.amount <= amount) {
    console.log('nosplit');
    return [null, stack];
  } else {
    console.log('splitting!');
    var remain = stack.amount - amount;
    stack.remove();

    var newOriginal = new PokerChipStack(stack.chipType, remain);
    newOriginal.setPosition(stack.position.x, stack.position.y);

    var newStack = new PokerChipStack(stack.chipType, amount);
    newStack.setPosition(stack.position.x, stack.position.y);

    return [newOriginal, newStack];
  }
};

StackManager.prototype._joinStacks = function(stack1, stack2) {
  if (!stack1) {
    stack1 = stack2;
    stack2 = null;
  }

  var totalAmount = 0;
  if (stack1) {
    totalAmount += stack1.amount;
    stack1.remove();
  }
  if (stack2) {
    totalAmount += stack2.amount;
    stack2.remove();
  }

  var newStack = new PokerChipStack(stack1.chipType, totalAmount);
  newStack.setPosition(stack1.position.x, stack1.position.y);

  return newStack;
};

StackManager.prototype.moveBetToPot = function(seatIdx, potNum, amount) {
  var betStack = this.betStacks[seatIdx];

  var splitStacks = this._splitStack(betStack, amount);
  this.betStacks[seatIdx] = splitStacks[0];
  var moveStack = splitStacks[1];

  var targetPos = MAINPOT_POSITION;
  if (potNum > 0) {
    targetPos = SIDEPOT_POSITION;
  }

  var self = this;
  moveStack.moveTo(targetPos[0], targetPos[1], 1000, function() {
    if (potNum === 0) {
      self.mainPot = self._joinStacks(self.mainPot, moveStack);
    } else {
      self.sidePot = self._joinStacks(self.sidePot, moveStack);
    }
  });
};

StackManager.prototype.movePotToSeat = function(potNum, seatIdx, amount) {
  var moveStack = null;

  if (potNum === 0) {
    var newStacks = this._splitStack(this.mainPot, amount);
    this.mainPot = newStacks[0];
    moveStack = newStacks[1];
  } else {
    var newStacks = this._splitStack(this.sidePot, amount);
    this.sidePot = newStacks[0];
    moveStack = newStacks[1];
  }

  var stackPos = this.seatPos[seatIdx];
  moveStack.moveTo(stackPos[0], stackPos[1], 1000, function() {
    moveStack.remove();
  });
};

StackManager.prototype.rakePot = function(potNum, amount) {
  console.log('raking pot', potNum, amount);
  if (potNum === 0) {
    var newStacks = this._splitStack(this.mainPot, amount);
    this.mainPot = newStacks[0];
    newStacks[1].remove();
  } else {
    var newStacks = this._splitStack(this.sidePot, amount);
    this.sidePot = newStacks[0];
    newStacks[1].remove();
  }
};

StackManager.prototype.setPotAmounts = function(pots) {
  if (this.mainPot) {
    this.mainPot.remove();
    this.mainPot = null;
  }
  if (this.sidePot) {
    this.sidePot.remove();
    this.sidePot = null;
  }

  var mainPotAmount = 0;
  var sidePotAmount = 0;
  if (pots.length > 0) {
    mainPotAmount += pots[0];
  }
  for (var i = 1; i < pots.length; ++i) {
    sidePotAmount += pots[i];
  }

  if (mainPotAmount > 0) {
    this.mainPot = new PokerChipStack(CHIP_TYPE, mainPotAmount);
    this.mainPot.setPosition(MAINPOT_POSITION[0], MAINPOT_POSITION[1]);
  }
  if (sidePotAmount > 0) {
    this.sidePot = new PokerChipStack(CHIP_TYPE, sidePotAmount);
    this.sidePot.setPosition(SIDEPOT_POSITION[0], SIDEPOT_POSITION[1]);
  }
};

var stackMgr = new StackManager();
