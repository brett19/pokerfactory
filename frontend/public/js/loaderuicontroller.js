function LoaderUiController() {
}

LoaderUiController.prototype.init = function() {
};

LoaderUiController.prototype.setText = function(text) {
  $('#loadingText').text(text);
};
LoaderUiController.prototype.setProgress = function(value) {
  var width = 224 * (value / 100)
  $('#loadingBar').css('width', width + 'px');

  var textValue = Math.floor(value);
  $('#loadingPerc').text(textValue + '%')
};
LoaderUiController.prototype.setWarningText = function(text) {
  if (!text || text.length < 0) {
    $('#loadingWarn').hide();
    return;
  }

  $('#loadingWarnText').text(text);
  $('#loadingWarn').show();
};
LoaderUiController.prototype.show = function() {
  $('#loading').show();
};
LoaderUiController.prototype.hide = function() {
  $('#loading').hide();
};

var loaderUi = new LoaderUiController();
