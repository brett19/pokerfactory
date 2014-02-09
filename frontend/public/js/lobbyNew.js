
connManager.connect('/');
connManager.on('open', function() {
});

var lobbyCache = {};
var lobbyData = {};
connManager.non('rooms_list', function(err, data) {
  lobbyCache = data;
  updateLobbyData();

  // TEST CODE
  //devAutoJoinRoom();
});

function devAutoJoinRoom() {
  var cashGames = lobbyData.cashGames;
  for (var j = 0; j < cashGames.length; ++i) {
    connManager.nemit('joincashroom', {
      id: cashGames[j].id
    });
    return;
  }
}

connManager.non('roomgroup_updated', function(err, data) {
  lobbyCache[data.group_name] = data.rooms;
  updateLobbyData();
});
connManager.non('roomgroup_gone', function(err, data) {
  delete lobbyCache[data.group_name];
  updateLobbyData();
});

function updateLobbyData() {
  lobbyData = {
    cashGames: [],
    sitngos: [],
    tournys: []
  };

  for (var i in lobbyCache) {
    if (lobbyCache.hasOwnProperty(i)) {
      var group = lobbyCache[i];

      for (var j = 0; j < group.cashGames.length; ++j) {
        lobbyData.cashGames.push(group.cashGames[j]);
      }
      for (var j = 0; j < group.sitngos.length; ++j) {
        lobbyData.sitngos.push(group.sitngos[j]);
      }
      for (var j = 0; j < group.tournys.length; ++j) {
        lobbyData.tournys.push(group.tournys[j]);
      }
    }
  }

  updateLobbyUi();
}

function updateLobbyUi() {
  console.log('lobby data', lobbyData);
  lobbyView.updateCashTables(lobbyData);
}

var tables = [];
connManager.non('room_joined', function(err, data) {
  var table = new TableController(data.roomId, data.name, data.state);
  tables.push(table);
});

function initGame() {
  lobbyTab = gameView.registerTab('Lobby', $('#lobby'));
  gameView.setTab(lobbyTab);
}

connManager.non('login_result', function(err, data) {
  initGame();
});



var FB_APP_ID = '251346378360166';
function doFbLogin() {
  window.parent.location = 'https://graph.facebook.com/oauth/authorize?client_id=' + FB_APP_ID + '&redirect_uri=' + window.location;
}

function handleFbLogin(fbId, fbTkn) {
  console.log(OPTIONS);
  if (OPTIONS['fbid']) {
    connManager.nemit('login', {
      fbId: OPTIONS['fbid'],
      fbTkn: 'super_secret_debug_token'
    });
  } else {
    connManager.nemit('login', {
      fbId: fbId,
      fbTkn: fbTkn
    });
  }
}

var lobbyTab = -1;
$(document).ready(function() {
  $.ajaxSetup({ cache: true });
  $.getScript('//connect.facebook.net/en_US/all.js', function(){
    FB.init({
      appId: FB_APP_ID,
      cookie: true
    });

    FB.getLoginStatus(function(response) {
      console.log('tick', response);
      if (response.status === 'connected') {
        handleFbLogin(
          response.authResponse.userID,
          response.authResponse.accessToken);
      } else if (response.status === 'not_authorized') {
        doFbLogin();
      } else {
        doFbLogin();
      }
    }, true);
  });
});
