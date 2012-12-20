var debug = require('debug')('SQS:Queue');

var Message = require('./message');

var utils = require('./utils');
var getSQS = utils.getSQS;
var seconds = utils.seconds;
var bytes = utils.bytes;
var call = utils.call;

module.exports = Queue;
/**
 * # Queue
 *
 * @param  {string}  queueName Name of the queue, identifier of the queue, or a promise for that.
 * @param  {string=} accessKey
 * @param  {string=} secretKey
 * @param  {string=} region
 * @return {Queue}
 */
function Queue(queueName, accessKey, secretKey, region) {
  if (!(this instanceof Queue)) return new Queue(queueName, accessKey, secretKey, region);
  var self = this;
  Object.defineProperty(this, '_sqs',{enumerable: false, configurable: false, writable: false, 
    value: getSQS(accessKey, secretKey, region)});
  function setQueue(name) {
    debug('set queue: ' + name);
    var parsed;
    if (parsed = /([0-9]{12}\/([^\/]+))\/?$/.exec(name)) {
      self._sqs.setQueue('/' + parsed[1] + '/');
      self.name = parsed[2];
      if (self._init) delete self._init;
    } else if (typeof name === 'string') {
      self.name = name;
      Object.defineProperty(self, '_init',{enumerable: false, configurable: true, writable: true, 
        value: getQueueURL(self, name).then(setQueue)});
      self.then = self._init.then;
      self.done = self._init.done;
    } else if (name && typeof name === 'object' && typeof name.then === 'function') {
      self.name = name.toString();
      Object.defineProperty(self, '_init',{enumerable: false, configurable: true, writable: true, 
        value: name.then(setQueue)});
      self.then = self._init.then;
      self.done = self._init.done;
    } else {
      throw new Error(JSON.stringify(name) + ' is not a valid queue.');
    }
  }
  setQueue(queueName);
}

function getQueueURL(client, name) {
  return call({_sqs: client._sqs}, 'GetQueueUrl', {QueueName: name})
    .then(function (res) {
      return res.GetQueueUrlResult.QueueUrl;
    });
}

function send(message, options) {
  var query = {};
  query.MessageBody = JSON.stringify(message);
  options = options || {};
  if (options.delay != null) {
    query.DelaySeconds = seconds(input, 'delay', 0, 900);
  }
  return call(this, 'SendMessage', query)
    .then(function (res) {
      res = res.SendMessageResult;
      return {
        md5: res.MD5OfMessageBody,
        id: res.MessageId
      };
    });
}
Queue.prototype.send = send;

function nextMessage(options) {
  debug('GetMessage');
  var self = this;
  return self.nextMessages(1, options)
    .then(function (res) {
      return res.length?res[0]:self.nextMessage(options);
    });
}
Queue.prototype.nextMessage = nextMessage;
function nextMessages(max, options) {
  var self = this;
  options = options || {};
  var query = {};
  query.AttributeName = 'All';
  query.MaxNumberOfMessages = max;
  if (options.visibilityTimeout != null) 
    query.VisibilityTimeout = seconds(options.visibilityTimeout, 'visibilityTimeout', 0, 43200);
  if (options.pollDuration != null)
    query.WaitTimeSeconds = seconds(options.pollDuration, 'pollDuration', 0, 20);
  return call(this, 'ReceiveMessage', query)
    .then(function (res) {
      res = res.ReceiveMessageResult.Message;
      if (!Array.isArray(res)) {
        if (res) {
          res = [res];
        } else {
          res = [];
        }
      }
      return res.map(function (data) { return Message(self, data); });
    });
}
Queue.prototype.nextMessages = nextMessages;