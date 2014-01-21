function Utils() {}

Utils.fmtCashAmt = function(amount) {
  var bigVal = Math.floor(amount / 100);
  var decVal = '' + (amount % 100);
  while (decVal.length < 2) {
    decVal = '0' + decVal;
  }
  return bigVal.toLocaleString() + '.' + decVal;
}

Utils.fmtFakeAmt = function(amount) {
  return amount.toLocaleString();
};

Utils.fmtChipAmtD = function(type, amount) {
  if (type === 0) {
    return '$' + Utils.fmtCashAmt(amount);
  } else {
    return '$' + Utils.fmtFakeAmt(amount);
  }
};

Utils.fmtChipAmt = function(type, amount) {
  if (amount === undefined) {
    amount = type;
    type = 1;
  }
  if (type === 0) {
    return Utils.fmtCashAmt(amount);
  } else {
    return Utils.fmtFakeAmt(amount);
  }
};

Utils.fmtDollarAmt = function(amount) {
  if (amount < 100) {
    return amount + '\xA2';
  }
  return Utils.fmtCashAmt(amount);
};
