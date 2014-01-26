var pubSub = require('../common/pubsub')();







var manager = ['localhost', 7600];
var backends = [
  ['localhost', 7700]
];

pubSub.bind('0.0.0.0', 7600);
