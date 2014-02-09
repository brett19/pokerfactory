var Logger = require('../../common/logger');
var db = require('../database')();

function User() {
  this.id = null;
  this.balance = 0;
  this.locale = null;
  this.username = null;
}

User.findOrCreateFromFbUser = function(fbUser, callback) {
  db.query('SELECT id,balance,locale,username FROM users WHERE fbId=?',
      [fbUser.id], function(err, rows) {
    if (err) {
      Logger.warn(err);
      return callback(Errors.dbGeneric());
    }

    console.log(fbUser, rows);

    if (rows.length < 1) {
      var f = fbUser;
      var initialBalance = 100000;
      db.query(
          'INSERT INTO users(fbId,balance,location,first_name,last_name,email,gender,locale,timezone,username) VALUES(?)',
          [[f.id, initialBalance, f.location, f.firstName, f.lastName, f.email, f.gender, f.locale, f.timezone, f.username]],
        function(err, res) {
          if (err) {
            Logger.warn(err);
            return callback(Errors.dbGeneric());
          }

          var u = new User();
          u.id = res.insertId;
          u.balance = initialBalance;
          u.locale = f.locale;
          u.username = f.username;
          callback(null, u);
        });
    } else {
      var u = new User();
      u.id = rows[0].id;
      u.balance = rows[0].balance;
      u.locale = rows[0].locale;
      u.username = rows[0].username;
      callback(null, u);
    }
  });
};

module.exports = User;
