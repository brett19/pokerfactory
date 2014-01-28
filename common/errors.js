var util = require('util');

function PFError(message, code) {
  Error.call(this);
  this.name = 'PFError';
  this.message = message;
  this.code = code;
}
util.inherits(PFError, Error);

PFError.prototype.toJSON = function() {
  return {
    code: this.code,
    text: this.message
  };
};

module.exports = {
  // Internal Ones

  // Client Ones
  tempInternal: function(){return new PFError('temporary internal error', 1001);},
  fbGeneric: function(){return new PFError('facebook error', 1002);},
  fbToken: function(){return new PFError('invalid facebook token', 1003);},
  dbGeneric: function(){return new PFError('database error', 1004);}

};
