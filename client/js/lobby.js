function formatCashNum(val) {
  var bigVal = Math.floor(val / 100);
  var decVal = '' + (val % 100);
  while (decVal.length < 2) {
    decVal = '0' + decVal;
  }
  return '$' + bigVal.toLocaleString() + '.' + decVal;
}
function formatFakeNum(val) {
  return '$' + val.toLocaleString();
}
function formatChipNum(type, val) {
  if (type === 0) {
    return formatCashNum(val);
  } else {
    return formatFakeNum(val);
  }
}

function formatDollars(val) {
  if (val < 100) {
    return val + '¢';
  }
  return formatCashNum(val);
}

connManager.connect('/');
connManager.on('open', function() {
  connManager.nemit('sub_lobby');
});

connManager.non('game_lobby', function(data) {
  var cashGameListEl = $('#cashgamelist tbody');
  cashGameListEl.empty();

  for (var i = 0; i < data.cashGames.length; ++i) {
    var cashGame = data.cashGames[i];

    var cashGameEl = $('<tr />');
    cashGameEl.append('<td>' + cashGame.name + '</td>');
    cashGameEl.append('<td>' + formatDollars(cashGame.smallBlind) + '/' + formatDollars(cashGame.bigBlind) + '</td>');
    cashGameEl.append('<td>' + cashGame.seatedCount + '/' + cashGame.seatCount + '</td>');

    cashGameEl.click(function() {
      connManager.nemit('room_join', {
        id: cashGame.id
      });
    });

    cashGameListEl.append(cashGameEl);
  }
});

function openRoom(info) {
  var windowHandle = window.open('table.html', 'table_' + info.id, 'width=800,height=600,top=50,left=50');
  windowHandle.connManager = connManager;
  windowHandle.roomInfo = info;
}

function LoginUiController() {
}

LoginUiController.prototype.init = function() {
  var self = this;
  $('#do_login').click(function() {
    self.doLogin();
  });
};

LoginUiController.prototype.show = function() {
  $('#login').show();
};
LoginUiController.prototype.hide = function() {
  $('#login').hide();
};

LoginUiController.prototype.setUsername = function(val) {
  $('#login_username').val(val);
};

LoginUiController.prototype.doLogin = function() {
  console.log('attempt login');
};

var loginUi = new LoginUiController();

function beginLoginState() {
  loginUi.show();

  if (OPTIONS['autologin']) {
    loginUi.setUsername(OPTIONS['autologin']);
    loginUi.doLogin();
  }
}

$(document).ready(function() {
  loaderUi.init();
  loginUi.init();

  $('#login').hide();
  $('#lobby').hide();

  loaderUi.show();
  preloadManager.start(function() {
    loaderUi.hide();
    beginLoginState();
  });
});
