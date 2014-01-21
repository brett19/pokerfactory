var MIN_CONN_TIME = 1500;
var SMOOTHING_AMOUNT = 0.8;

if (OPTIONS['dev']) {
  MIN_CONN_TIME = 0;
  SMOOTHING_AMOUNT = 0;
}

function preloadManager() {
  this.needAssetLoad = true;
}

preloadManager.prototype.start = function(completeCallback) {
  loaderUi.setText('');
  loaderUi.setProgress(0);

  this.loadStates = [];
  this.startTime = Date.now();

  this._startLoad(this._startAssetLoad);
  this._startLoad(this._startConnLoad);
  this._updateProgress();

  var bigState = null;
  var bigStateVal = 0;
  var curProgress = 0;
  var self = this;
  var tickTimer = setInterval(function() {
    var elapsedTime = Date.now() - self.startTime;

    var total = 0;
    var current = 0;
    var estimCurrent = 0;

    for (var i = 0; i < self.loadStates.length; ++i) {
      var loadState = self.loadStates[i];
      var estimThis = loadState.total / loadState.estimate * elapsedTime;
      if (estimThis > loadState.total) {
        estimThis = loadState.total;
      }

      var stateRemain = loadState.total - estimThis;
      if (stateRemain >= bigStateVal) {
        bigState = loadState;
        bigStateVal = stateRemain;
      }

      total += loadState.total;
      current += loadState.current;
      estimCurrent += estimThis;
    }

    var diffAmount = estimCurrent - curProgress;
    if (diffAmount < 0) {
      diffAmount = 0;
    }

    curProgress += diffAmount * (1.0 - SMOOTHING_AMOUNT);

    var smoothedProgress = curProgress;
    if (smoothedProgress > 100) {
      smoothedProgress = 100;
    }

    if (total > 0) {
      loaderUi.setText(bigState.name);
      loaderUi.setProgress(smoothedProgress / total * 100);
    } else {
      loaderUi.setProgress(100);
    }

    if (current >= total) {
      if (completeCallback) {
        completeCallback();
      }
      loaderUi.hide();
      clearInterval(tickTimer);
      tickTimer = null;
    }

  }, 100);
};

preloadManager.prototype._startLoad = function(handler) {
  var loadState = {};

  loadState.name = 'Loading, uh, something...';
  loadState.current = 0;

  var self = this;
  loadState.update = function(val) {
    loadState.current = val;
    self._updateProgress();
  };
  loadState.total = handler.call(this, loadState);

  if (loadState.total > 0) {
    this.loadStates.push(loadState);
  }
};
preloadManager.prototype._updateProgress = function() {
  for (var i = 0; i < this.loadStates.length; ++i) {
    var loadState = this.loadStates[i];

    if (loadState.current > 0) {
      var elapsedTime = Date.now() - this.startTime;
      loadState.estimate = elapsedTime / loadState.current * loadState.total;
    }
  }
};

preloadManager.prototype._startAssetLoad = function(state) {
  if (!this.needAssetLoad) return 0;
  state.name = 'Loading assets...';
  state.estimate = 10000;

  var queue = new createjs.LoadQueue(true);
  queue.installPlugin(createjs.Sound);
  queue.loadManifest([
    'imgs/roomBg.png',
    'imgs/table.png',
    'sounds/win.wav'
  ]);

  var self = this;
  queue.on('progress', function(e) {
    state.update(80 * e.progress);
  });
  queue.on("complete", function() {
    self.needAssetLoad = false;
    state.update(80);
  });

  return 80;
};

preloadManager.prototype._startConnLoad = function(state) {
  if (connManager.connected()) return 0;
  state.name = 'Connecting to Server...';
  state.estimate = MIN_CONN_TIME;

  // State mixer for bottom two things
  var mixState = 0;
  var tickState = function() {
    if (mixState++ === 1) {
      state.update(20);
    }
  }

  // Minimum Wait Timer
  var minWaitTimer = setTimeout(function() {
    tickState();
    minWaitTimer = null;
  }, MIN_CONN_TIME);

  // Connection State Timer
  var self = this;
  var connOpenHandler = function() {
    tickState();
    connManager.off('open', connOpenHandler);
  };
  connManager.on('open', connOpenHandler);

  return 20;
};

var preloadManager = new preloadManager();
