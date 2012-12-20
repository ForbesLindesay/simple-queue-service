var Queue = require('./lib/queue');
var Client = require('./lib/client');
var Message = require('./lib/message');
module.exports = Client;
Client.Queue = Queue;
Client.Message = Message;