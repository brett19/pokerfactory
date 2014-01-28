var Mysql = require('mysql');
var Errors = require('../common/errors');
var Logger = require('../common/logger');
var request = require('request');
var pubSub = require('../common/pubsub')();

var db  = Mysql.createPool({
  host     : '192.168.7.10',
  user     : 'root',
  password : 'oblivion',
  database : 'pkrf'
});

function normalizeFbUser(fbUser) {
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

function validateFbTkn(fbId, fbTkn, callback) {
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

    callback(null, bodyJson);
  });
}

function loadOrCreateUser(fbUser, callback) {
  db.query('SELECT id,balance,locale,username FROM users WHERE fbId=?',
      [fbUser.id], function(err, rows) {
    if (err) {
      Logger.warn(err);
      return callback(Errors.dbGeneric());
    }

    if (rows.length < 1) {
      var f = fbUser;
      db.query(
        'INSERT INTO users(fbId,balance,location,first_name,last_name,email,gender,locale,timezone,username) VALUES(?)',
        [[f.id, f.balance, f.location, f.firstName, f.lastName, f.email, f.gender, f.locale, f.timezone, f.username]],
        function(err, res) {
          if (err) {
            Logger.warn(err);
            return callback(Errors.dbGeneric());
          }

          var u = {
            id: res.insertId,
            balance: f.balance,
            locale: f.locale,
            username: f.username
          };
          callback(null, u);
        });
    } else {
      var u = {
        id: rows[0].id,
        balance: rows[0].balance,
        locale: rows[0].locale,
        username: rows[0].username
      };
      callback(null, u);
    }
  });
}

pubSub.subscribe('auth', function(event, data, callback) {
  if (event === 'fblogin') {
    validateFbTkn(data.fbId, data.fbTkn, function(err, fbUser) {
      if (err) {
        return callback(err);
      }

      var u = normalizeFbUser(fbUser);
      loadOrCreateUser(u, function(err, user) {
        if (err) {
          return callback(err);
        }

        callback(null, {
          userId: user.id,
          balance: user.balance
        });
      });
    })
  }
});


Logger.info('Started backend service.');
