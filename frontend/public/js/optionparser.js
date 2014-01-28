var OPTIONS = {};

function parseOptions() {
  var windowHash = window.location.hash;

  if (windowHash.length < 1) {
    return;
  }

  windowHash = windowHash.substr(1);
  var parts = windowHash.split(',');
  for (var i = 0; i < parts.length; ++i) {
    var subPart = parts[i].split('=');
    var optionName = subPart[0].toLowerCase();
    var optionValue = subPart.length > 1 ? subPart[1] : null;

    if (optionValue === null) {
      OPTIONS[optionName] = true;
    } else if (subPart.length === 2) {
      OPTIONS[optionName] = optionValue;
    }
  }
}

var lastHash = window.location.hash;
setInterval(function() {
  if (window.location.hash !== lastHash) {
    lastHash = window.location.hash;
    parseOptions();
  }
}, 200);
parseOptions();
