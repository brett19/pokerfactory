function TableConnManager() {
}
TableConnManager.prototype.non = function(evt, handler) {
  opener.connManager.non(evt, function(data) {
    if (data.roomId === myRoomId) {
      handler(data);
    }
  });
  return;

  opener.connManager.non(evt, function(data) {
    setTimeout(function() {
      handler(data);
    }, 0);
  });
};
TableConnManager.prototype.noff = function(evt, handler) {
  throw new Error('not yet supported');
};

TableConnManager.prototype.nemit = function(cmd, data) {
  if (!data) {
    data = {};
  }

  data.roomId = myRoomId;

  return opener.connManager.nemit(cmd, data);
};
var connManager = new TableConnManager();



var roomLeft = false;
var openerClosing = false;
opener.onbeforeunload = function() {
  openerClosing = true;
  window.close();
}
window.onbeforeunload = function() {
  if (!openerClosing && !roomLeft) {
    opener.roomClosed(window, myRoomId);
    roomLeft = true;
    window.close();
  }
};
