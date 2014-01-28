function HrTimer() {
  this.stime = process.hrtime();
}

HrTimer.prototype.toString = function() {
  var dtime = process.hrtime(this.stime);
  return Math.ceil(dtime[0] * 1e3 + dtime[1] / 1e6) + 'ms';
};
HrTimer.prototype.inspect = function() {
  return this.toString();
};

module.exports = HrTimer;
