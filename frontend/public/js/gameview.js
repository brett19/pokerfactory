function GameView() {
  this.tabs = [];
  this.tabId = 0;
}

GameView.prototype.registerTab = function(title, tabEl) {
  var tabId = this.tabId++;
  var el = $('<div class="tab">' + title + '</div>');

  var self = this;
  el.click(function() {
    self.clearTabFlash(tabId);
    self.setTab(tabId);
  });

  this.tabs.push({
    id: tabId,
    title: title,
    el: el,
    tabEl: tabEl,
    flashTimer: null,
    flashState: false
  });

  tabEl.hide();
  $('#tabs').append(el);

  return tabId;
};

GameView.prototype.setTab = function(tabId) {
  for (var i = 0; i < this.tabs.length; ++i) {
    var tab = this.tabs[i];
    if (tab.id === tabId) {
      tab.el.addClass('tabSelected');
      tab.tabEl.show();
    } else {
      tab.el.removeClass('tabSelected');
      tab.tabEl.hide();
    }
  }
};

GameView.prototype.startTabFlash = function(tabId) {
  for (var i = 0; i < this.tabs.length; ++i) {
    var tab = this.tabs[i];
    if (tab.id !== tabId) {
      continue;
    }

    if (tab.flashTimer) {
      clearInterval(tab.flashTimer);
      tab.flashTimer = null;
    }

    tab.flashTimer = setInterval(function() {
      if (!tab.flashState) {
        tab.el.addClass('tabFlash');
        tab.flashState = true;
      } else {
        tab.el.removeClass('tabFlash');
        tab.flashState = false;
      }
    }, 500);

    break;
  }
};

GameView.prototype.clearTabFlash = function(tabId) {
  for (var i = 0; i < this.tabs.length; ++i) {
    var tab = this.tabs[i];
    if (tab.id !== tabId) {
      continue;
    }

    if (tab.flashTimer) {
      clearInterval(tab.flashTimer);
      tab.flashTimer = null;
    }

    tab.el.removeClass('tabFlash');
    tab.flashState = false;

    break;
  }
};

var gameView = new GameView();
