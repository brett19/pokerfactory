


document.title = 'Stag Poker - ' + roomInfo.name;

createjs.Sound.registerSound('sounds/poker_dealing_single.wav', 'dealing');
createjs.Sound.registerSound('sounds/raise_more.wav', 'call_chips');
createjs.Sound.registerSound('sounds/all_in.wav', 'bet_chips');
createjs.Sound.registerSound('sounds/win.wav', 'win_chips');
createjs.Sound.registerSound('sounds/Fold.wav', 'fold');
createjs.Sound.registerSound('sounds/timer_10_sec.wav', 'timer_10_sec');
createjs.Sound.registerSound('sounds/warning.wav', 'timer_warning');
createjs.Sound.registerSound('sounds/check.wav', 'check');
createjs.Sound.registerSound('sounds/drawcard.mp3', 'drawcard');
createjs.Sound.setVolume(0.4);

var CHIP_TYPE = 0;

var mainPot = null;
var sidePot = null;

var mySeatIdx = -1;
var myRoomId = roomInfo.id;
var seats = [];
var bets = [];

function setMySeatIdx(seatIdx) {
  mySeatIdx = seatIdx;

  if (mySeatIdx !== -1) {
    $('#playerActions').show();
  } else {
    $('#playerActions').hide();
  }
}

function trySitDownAt(seatIdx) {
  connManager.nemit('tbl_sitdown', {
    buyIn: 400 + Math.floor(Math.random()*100),
    seatIdx: seatIdx
  });
}

function setActionOn(seatIdx, myOpts, timerLeft, timerTotal) {
  for (var i = 0; i < seats.length; ++i) {
    seats[i].setIsTheAction(i === seatIdx);

    if (i === seatIdx) {
      seats[i].setTimer(timerLeft, timerTotal);
    } else {
      seats[i].setTimer(0, 0);
    }
  }

  if (!myOpts) {
    return;
  }

  if (myOpts.type !== 'bet') {
    return;
  }


  if (seatIdx === mySeatIdx) {
    optionsUi.setBetRange(myOpts.bet_min, myOpts.bet_max, myOpts.bet_pot);
    optionsUi.setCanFold(myOpts.fold);
    optionsUi.setCanCheck(myOpts.check);
    optionsUi.setCanCall(myOpts.call, myOpts.call_cost);
    optionsUi.setCanBet(myOpts.bet);
    optionsUi.setCanRaise(myOpts.raise);
    optionsUi.show();
  } else {
    optionsUi.hide();
  }
}

function rescaleMe() {
  return;
  var scaleX = $(window).width() / 991;
  var scaleY = $(window).height() / 772;
  var scale = 4.0;
  if (scaleX < scale) scale = scaleX;
  if (scaleY < scale) scale = scaleY;
  $('#pageWrap').css('transform', 'scale(' + scale + ')');
}

function initRoom() {
  window.onresize = function(event) {
    rescaleMe();
  };
  rescaleMe();

  console.log(roomInfo);
  var infoSeats = roomInfo.state.seats;

  stackMgr.setSeatCount(infoSeats.length);

  for (var i = 0; i < infoSeats.length; ++i) {
    if (infoSeats[i] && infoSeats[i].myself) {
      setMySeatIdx(i);
    }
  }

  for (var i = 0; i < infoSeats.length; ++i) {
    var seat = new TableSeat(i, infoSeats.length);
    seat.setInfo(infoSeats[i]);
    seat.setCanSitHere(mySeatIdx === -1);

    seats.push(seat);
  }

  stackMgr.setPotAmounts(roomInfo.state.pots);
  commUi.setCards(roomInfo.state.communityCards);
  setActionOn(
    roomInfo.state.actionPos,
    roomInfo.state.myOptions,
    roomInfo.state.actionTimer,
    roomInfo.state.actionTimerLen
  );

  optionsUi.on('foldClicked', function() {
    connManager.nemit('tbl_fold');
  });
  optionsUi.on('checkClicked', function() {
    connManager.nemit('tbl_check');
  });
  optionsUi.on('callClicked', function() {
    connManager.nemit('tbl_call');
  });
  optionsUi.on('betClicked', function() {
    connManager.nemit('tbl_bet', {
      amount: optionsUi.betAmount
    });
  });
  optionsUi.on('raiseClicked', function() {
    connManager.nemit('tbl_raise', {
      amount: optionsUi.betAmount
    });
  });

   $('#actStand').on('click', function() {
   connManager.nemit('tbl_standup');
   });
   $('#actSitOut').on('click', function() {
   connManager.nemit('tbl_sitout');
   });
   $('#actSitIn').on('click', function() {
   connManager.nemit('tbl_sitin');
   });

}

connManager.non('tbl_playersat', function(data) {
  var seat = seats[data.seatIdx];
  seat.setInfo(data.state);

  if (data.state.myself) {
    setMySeatIdx(data.seatIdx);
    for (var i = 0; i < seats.length; ++i) {
      seats[i].setCanSitHere(false);
    }
  }
});

connManager.non('tbl_playersatin', function(data) {
  var seat = seats[data.seatIdx];
  seat.setSittingOut(false);
});

connManager.non('tbl_playersatout', function(data) {
  var seat = seats[data.seatIdx];
  seat.setSittingOut(true);
});

connManager.non('tbl_playerstood', function(data) {
  var seat = seats[data.seatIdx];
  seat.setInfo(null);

  if (data.seatIdx === mySeatIdx) {
    setMySeatIdx(-1);
    for (var i = 0; i < seats.length; ++i) {
      seats[i].setCanSitHere(true);
    }
  }
});

connManager.non('tbl_playerbalancechanged', function(data) {
  var seat = seats[data.seatIdx];
  seat.setBalance(data.balance);
});

connManager.non('tbl_playerbetchanged', function(data) {
  var seat = seats[data.seatIdx];
  seat.setBet(data.bet);
});

connManager.non('tbl_playerbettopot', function(data) {
  stackMgr.moveBetToPot(data.seatIdx, data.potIdx, data.amount);
});

connManager.non('tbl_pottoplayer', function(data) {
  createjs.Sound.play("win_chips");

  var seat = seats[data.seatIdx];
  stackMgr.movePotToSeat(data.potIdx, data.seatIdx, data.amount);
  seat.addBalance(data.amount);
});

connManager.non('tbl_dealthands', function(data) {
  for (var i = 0; i < data.hands.length; ++i) {
    (function(seatIdx, hand) {
      if (!hand) {
        return;
      }

      for (var j = 0; j < hand.length; ++j) {
        (function(cardNum) {
          setTimeout(function() {
            seats[seatIdx].dealHoleCard(cardNum, hand[cardNum])
          }, j * 400);
        })(j);
      }
    })(i, data.hands[i]);
  }

  // TODO: OMAHA!?
  for (var i = 0; i < 2; ++i) {
    setTimeout(function() {
      createjs.Sound.play('dealing');
    }, i * 400);
  }
});

connManager.non('tbl_dealtcommunity', function(data) {
  commUi.dealCards(data.cards);
});

connManager.non('tbl_actionmoved', function(data) {
  setActionOn(data.seatIdx, data.myOptions, data.timer, data.timer);
});

connManager.non('tbl_playerfolded', function(data) {
  createjs.Sound.play('fold');

  var seat = seats[data.seatIdx];
  seat.setHoleCards([]);
});
connManager.non('tbl_playerchecked', function(data) {
  createjs.Sound.play('check');
});
connManager.non('tbl_playercalled', function(data) {
  createjs.Sound.play('call_chips');
});
connManager.non('tbl_playerbet', function(data) {
  createjs.Sound.play('bet_chips');
});
connManager.non('tbl_playerraised', function(data) {
  createjs.Sound.play('bet_chips');
});

connManager.non('tbl_exposehand', function(data) {
  var seat = seats[data.seatIdx];
  seat.setHoleCards(data.cards);
});

connManager.non('tbl_potraked', function(data) {
  stackMgr.rakePot(data.potIdx, data.amount);
});

connManager.non('tbl_handfinished', function(data) {
  console.log('hand finished');

  commUi.setCards([]);
  for (var i = 0; i < seats.length; ++i) {
    seats[i].setHoleCards([]);
  }
});

$(document).ready(function() {
  initRoom();
});
