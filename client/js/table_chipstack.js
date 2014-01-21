var STACK_AMOUNTS = [
  [1, '1'],
  [5, '5'],
  [25, '25'],
  [100, '100'],
  [1000, '1k'],
  [5000, '5k'],
  [25000, '25k'],
  [100000, '100k'],
  [250000, '250k'],
  [1000000, '1m'],
  [5000000, '5m'],
  [25000000, '25m']
];

function PokerChipStack(type, amount) {
  this.el = $('<div />');
  $('#chipStacks').append(this.el);

  this.chipType = type;
  this.amount = amount;

  var wrap = this.el;
  wrap.addClass('chipStack');

  var stackSizes = [];
  var amountLeft = amount;
  for (var i = STACK_AMOUNTS.length-1; i >= 0; --i) {
    var stackSize = Math.floor(amountLeft / STACK_AMOUNTS[i][0]);
    amountLeft -= stackSize * STACK_AMOUNTS[i][0];
    stackSizes.push([i, stackSize]);
  }

  var stacks = [];
  var lastStack = null;
  var lastChipId = -1;
  for (var i = 0; i < stackSizes.length; ++i) {
    var chipId = stackSizes[i][0];
    var stackSize = stackSizes[i][1];
    if (stackSize <= 0) continue;

    var stack = lastStack;
    if (Math.abs(chipId-lastChipId) > 2) {
      stack = null;
    }
    if (!stack) {
      stack = [];
    }
    for (var j = 0; j < stackSize; ++j) {
      stack.push(chipId);
    }
    if (stack !== lastStack) {
      lastChipId = chipId;
      stacks.push(stack);
      lastStack = stack;
    }
  }

  var CHIP_WIDTH = 28;
  var CHIP_HEIGHT = 2;

  var chipHtml = '';
  var posX = -stacks.length / 2 * CHIP_WIDTH;
  var posY = 0;
  for (var i = 0; i < stacks.length; ++i) {
    var stack = stacks[i];
    posY = 30;
    for (var j = 0; j < stack.length; ++j) {
      var num = STACK_AMOUNTS[stack[j]][0];
      posY += CHIP_HEIGHT;

      var text = '';
      if (j === stack.length - 1) {
        text = STACK_AMOUNTS[stack[j]][1];
      }

      chipHtml += '<div class="chip chip' + num + '" style="top:' + -posY + 'px;left:' + posX + 'px">' + text + '</div>';
    }
    posX += CHIP_WIDTH;
  }
  chipHtml += '<div class="chipStackValue">' + Utils.fmtChipAmt(amount) + '</div>';
  wrap.append(chipHtml);

  this.position = {x: 0, y: 0};
}

PokerChipStack.prototype.remove = function() {
  this.el.remove();
};

PokerChipStack.prototype.setPosition = function(x, y) {
  this.position.x = x;
  this.position.y = y;

  this.el.css('left', this.position.x + 'px');
  this.el.css('top', this.position.y + 'px');
};

PokerChipStack.prototype.moveTo = function(x, y, duration, handler) {
  this.position.x = x;
  this.position.y = y;

  this.el.animate({
    'left': x + 'px',
    'top': y + 'px'
  }, duration, handler);
};
