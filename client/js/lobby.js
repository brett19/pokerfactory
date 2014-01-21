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
    return val + '\xA2';
  }
  return formatCashNum(val);
}

connManager.connect('/');
connManager.on('open', function() {
  connManager.nemit('sub_lobby');
});

connManager.non('game_lobby', function(data) {
  console.log('lobby data', data);

  var cashGameListEl = $('#cashgamelist tbody');
  cashGameListEl.empty();

  for (var i = 0; i < data.cashGames.length; ++i) {
    var cashGame = data.cashGames[i];

    var cashGameEl = $('<tr />');
    cashGameEl.append('<td>' + cashGame.name + '</td>');
    cashGameEl.append('<td>' + formatDollars(cashGame.smallBlind) + '/' + formatDollars(cashGame.bigBlind) + '</td>');
    cashGameEl.append('<td>' + cashGame.seatedCount + '/' + cashGame.seatCount + '</td>');

    (function (cashGameId) {
      cashGameEl.click(function() {
        connManager.nemit('game_joincashroom', {
          id: cashGameId
        });
      });
    })(cashGame.id);

    cashGameListEl.append(cashGameEl);
  }
});

var openRooms = [];

function openRoom(info) {
  var windowHandle = window.open('table.html#' + info.id, '', 'width=991,height=772,resizeable=no,scrollsbars=no,status=no,menubar=no,location=no');
  openRooms.push(windowHandle);

  windowHandle.myWindowHandle = windowHandle;
  windowHandle.roomInfo = info;
}
function roomOpened(windowHandle, roomId, func) {
  // Not yet implemented
}
function roomClosed(windowHandle, roomId) {
  connManager.nemit('room_leave', {
    roomId: roomId
  });
}

function LoginUiController() {
}

LoginUiController.prototype.init = function() {
  var self = this;
  $('#do_login').click(function() {
    self.doLogin();
  });

  connManager.non('login_success', function(data) {
    self.stopTryLogin();
    beginLobbyState();
  });
  connManager.non('login_failed', function(data) {
    self.stopTryLogin();
    self.setWarningText('bad username/password');
  });
};

LoginUiController.prototype.show = function() {
  $('#login').show();
};
LoginUiController.prototype.hide = function() {
  $('#login').hide();
};

LoginUiController.prototype.setWarningText = function(text) {
  $('#login_warning').html('<b>Warning:</b> ' + text);
}

LoginUiController.prototype.setUsername = function(val) {
  $('#login_username').val(val);
};

LoginUiController.prototype.beginTryLogin = function() {
  $('#login_username').attr('disabled', true);
  $('#login_password').attr('disabled', true);
  $('#do_login').hide();
  $('#login_progress').text('Logging in...');
  $('#login_progress').show();
};
LoginUiController.prototype.stopTryLogin = function() {
  $('#login_username').attr('disabled', false);
  $('#login_password').attr('disabled', false);
  $('#do_login').show();
  $('#login_progress').hide();
}

LoginUiController.prototype.doLogin = function() {
  this.beginTryLogin();

  var username = $('#login_username').val();
  var password = $('#login_password').val();

  connManager.nemit('login', {
    username: username,
    password: password
  })
  console.log('attempt login');
};

var loginUi = new LoginUiController();


function LobbyUiController() {
}
LobbyUiController.prototype.init = function() {
  connManager.non('game_openroom', function(data) {
    openRoom(data);
  });
};
LobbyUiController.prototype.show = function() {
  $('#lobby').show();
};
LobbyUiController.prototype.hide = function() {
  $('#lobby').hide();
};

var lobbyUi = new LobbyUiController();

function beginLobbyState() {
  loginUi.hide();
  lobbyUi.show();
}

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
  lobbyUi.init();

  connManager.on('close', function() {
    for (var i = 0; i < openRooms.length; ++i) {
      openRooms[i].close();
    }
    openRooms = [];

    loginUi.hide();
    lobbyUi.hide();
    loaderUi.show();

    loaderUi.setWarningText('Your connection to the server has been lost.');
    preloadManager.start(function() {
      console.log('reconnected....');

      loaderUi.hide();
      beginLoginState();
    });
  });

  loginUi.hide();
  lobbyUi.hide();
  loaderUi.show();
  preloadManager.start(function() {
    loaderUi.hide();
    beginLoginState();
  });
});
