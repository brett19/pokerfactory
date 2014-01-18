document.title = 'Stag Poker - ' + roomInfo.name;

$(document).ready(function() {
  console.log('test');
  connManager.non('tbl_something', function() {
    console.log('test22');
  });
});