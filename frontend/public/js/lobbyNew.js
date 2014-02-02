
connManager.connect('/');
connManager.on('open', function() {
  //connManager.nemit('sub_lobby');
});

var lobbyCache = {};
var lobbyData = {};
connManager.non('rooms_list', function(err, data) {
  lobbyCache = data;
  updateLobbyData();
});
connManager.non('roomgroup_updated', function(err, data) {
  lobbyCache[data.group_name] = data.rooms;
  updateLobbyData();
});
connManager.non('roomgroup_gone', function(err, data) {
  delete lobbyCache[data.group_name];
  updateLobbyData();
})

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

  var cashGameListEl = $('#cashgamelist tbody');
  cashGameListEl.empty();

  for (var i = 0; i < lobbyData.cashGames.length; ++i) {
    var cashGame = lobbyData.cashGames[i];

    var cashGameEl = $('<tr />');
    cashGameEl.append('<td>' + cashGame.name + '</td>');
    cashGameEl.append(
      '<td>' +
        Utils.fmtDollarAmt(cashGame.smallBlind) +
        '/' +
        Utils.fmtDollarAmt(cashGame.bigBlind) +
        '</td>');
    cashGameEl.append('<td>' + cashGame.seatedCount + '/' + cashGame.seatCount + '</td>');

    (function (cashGameId) {
      cashGameEl.click(function() {
        connManager.nemit('joincashroom', {
          id: cashGameId
        });
      });
    })(cashGame.id);

    cashGameListEl.append(cashGameEl);
  }
}


connManager.non('room_joined', function(err, data) {
  var el = $('<div>Test Tab ' + data.name + '</div>')
  $('#tabContent').append(el);

  var tabId = gameView.registerTab(data.name, el);
  gameView.startTabFlash(tabId);
});

var FB_APP_ID = '251346378360166';

function doFbLogin() {
  window.parent.location = 'https://graph.facebook.com/oauth/authorize?client_id=' + FB_APP_ID + '&redirect_uri=' + window.location;
}

function handleFbLogin(fbId, fbTkn) {
  connManager.nemit('login', {
    fbId: fbId,
    fbTkn: fbTkn
  });
}

$(document).ready(function() {
  gameView.registerTab('Lobby', $('#lobby'));

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
