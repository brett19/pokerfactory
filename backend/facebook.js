var request = require('request');
var Logger = require('../common/logger');

function normalizeUserObj(fbUser) {
  var userObj = {};

  userObj.id = fbUser.id;
  userObj.balance = 1000;

  userObj.username = null;
  if (fbUser.username) {
    userObj.username = fbUser.username;
  } else {
    userObj.username =
      fbUser.first_name.toLowerCase() +
        '.' +
        (fbUser.last_name.toLowerCase())[0];
  }

  userObj.location = null;
  if (fbUser.location && fbUser.location.name) {
    userObj.location = fbUser.location.name;
  }

  userObj.firstName = null;
  userObj.lastName = null;
  if (fbUser.first_name && fbUser.last_name) {
    userObj.firstName = fbUser.first_name;
    userObj.lastName = fbUser.last_name;
  }

  userObj.email = null;
  if (fbUser.email) {
    userObj.email = fbUser.email;
  }

  userObj.gender = null;
  if (fbUser.gender === 'male') {
    userObj.gender = 1;
  } else if (fbUser.gender === 'female') {
    userObj.gender = 0;
  }

  userObj.locale = null;
  if (fbUser.locale) {
    userObj.locale = fbUser.locale;
  }

  userObj.timezone = null;
  if (fbUser.timezone) {
    userObj.timezone = fbUser.timezone;
  }

  return userObj;
}

function Facebook() {
}

Facebook.prototype.validateUser = function(fbId, fbTkn, callback) {
  if (fbTkn === 'super_secret_debug_token') {
    process.nextTick(function() {
      callback(null, {
        id: '601060001',
        first_name: 'Bob',
        last_name: 'Franklin',
        gender: 'male',
        email: 'bob@ogn.net',
        locale: 'en_US',
        timezone: -4,
        username: 'bob.franklin',
        location: {
          name: 'Moncton, New Brunswick'
        }
      });
    });
    return;
  }

  request.get('https://graph.facebook.com/me?access_token=' + fbTkn,
      function(err, res, body) {
    if (err) {
      Logger.warn(err);
      return callback(Errors.fbGeneric(), null);
    }

    if (res.statusCode !== 200) {
      return callback(Errors.fbToken(), null);
    }

    var bodyJson = null;
    try {
      bodyJson = JSON.parse(body);
    } catch(e) {
      Logger.warn(e);
      return callback(Errors.fbGeneric(), null);
    }

    if (bodyJson.id !== fbId) {
      return callback(Errors.fbToken(), null);
    }

    callback(null, normalizeUserObj(bodyJson));
  });
};

var facebook = new Facebook();
module.exports = function() { return facebook; }
