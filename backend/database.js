var Mysql = require('mysql');

var db = Mysql.createPool({
  host     : '192.168.7.10',
  user     : 'root',
  password : 'oblivion',
  database : 'pkrf'
});

module.exports = function() { return db; }
