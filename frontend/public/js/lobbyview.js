function LobbyView() {
  $(document).ready(function() {
    this.el = $('#lobby');
  }.bind(this));
}

LobbyView.prototype.updateCashTables = function(lobbyData) {
  var cashGameListEl = this.el.find('#cashgamelist tbody');
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
};


var lobbyView = new LobbyView();
