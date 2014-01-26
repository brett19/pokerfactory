
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
    cashGameEl.append(
      '<td>' +
      Utils.fmtDollarAmt(cashGame.smallBlind) +
      '/' +
      Utils.fmtDollarAmt(cashGame.bigBlind) +
      '</td>');
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

connManager.non('game_openroom', function(data) {
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
  connManager.nemit('fblogin', {
    fbId: fbId
    //,fbTkn: fbTkn
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
