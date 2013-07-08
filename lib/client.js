var utils = require('./utils');
var getSQS = utils.getSQS;
var seconds = utils.seconds;
var bytes = utils.bytes;
var call = utils.call;
var Queue = require('./queue');
var debug = require('debug')('SQS');
debug('client.js');
console.error('client?', process.env.__DEBUG__)
module.exports = Client;
/**
 * # Client
 * 
 * @param  {string=} accessKey
 * @param  {string=} secretKey
 * @param  {string=} region
 * @return {Client}
 */
function Client(accessKey, secretKey, region) {
  if (!(this instanceof Client)) return new Client(accessKey, secretKey, region);
  Object.defineProperty(this, '_sqs',{enumerable: false, configurable: false, writable: false, 
    value: getSQS(accessKey, secretKey, region)});
  Object.defineProperty(this, '_keys',{enumerable: false, configurable: false, writable: false, 
    value: {accessKey: accessKey, secretKey: secretKey, region: region}});
}

/**
 * ## Client#createQueue(name, options)
 *
 * Options:
 * 
 *  - delay
 *  - messageRetention
 *  - pollDuration
 *  - visibilityTimeout
 *  - maxMessageSize
 * 
 * @param {string} name    string The name of the queue to create
 * @param {object} options A hash of options
 * @returns {Queue}
 */
function createQueue(name, options) {
  options = options || {};
  var attributes = [];
  function attr(name, value) { attributes.push({name: name, value: value}); }
  if (options.delay != null)
    attr('DelaySeconds', seconds(options.delay, 'delay', 0, 900));
  if (options.messageRetentionPeriod != null)
    attr('MessageRetentionPeriod', seconds(options.messageRetention, 'messageRetention', 60, 1209600));
  if (options.pollDuration != null)
    attr('ReceiveMessageWaitTimeSeconds', seconds(options.pollDuration, 'pollDuration', 0, 20));
  else
    attr('ReceiveMessageWaitTimeSeconds', 20);
  if (options.visibilityTimeout != null)
    attr('VisibilityTimeout', seconds(options.visibilityTimeout, 'visibilityTimeout', 0, 43200));
  if (options.maxMessageSize != null)
    attr('MaximumMessageSize', bytes(options.maxMessageSize, 'MaximumMessageSize', 1024, 65536));

  var query = {};
  query.QueueName = name;
  for (var i = 0; i < attributes.length; i++) {
    query['Attribute.' + (i+1) + '.Name'] = attributes[i].name;
    query['Attribute.' + (i+1) + '.Value'] = attributes[i].value;
  }
  var queueURL = call(this, 'CreateQueue', query)
    .then(function (res) {
      return res.CreateQueueResult.QueueUrl;
    });
  queueURL.toString = function () { return name; };
  return Queue(queueURL, this._keys.accessKey, this._keys.secretKey, this._keys.region);
}
Client.prototype.createQueue = createQueue;

function getQueue(name) {
  return Queue(name, this._keys.accessKey, this._keys.secretKey, this._keys.region);
}
Client.prototype.getQueue = getQueue;

function listQueues(prefix) {
  var query = {};
  if (prefix) {
    query[QueueNamePrefix] = prefix;
  }
  return call(this, 'ListQueues', query)
    .then(function (res) {
      debug('listQueueResult', res);
      var queues = res.ListQueuesResult.QueueUrl;
      debug('got queues', queues);
      if (!Array.isArray(queues)) queues = [queues];
      return queues.map(function(queue){
        if(typeof queue === 'object'){
          queue = queue['#']; // returns objects like {'#':'<url>'}
        }
        return Queue(queue);
      });
    });
}
Client.prototype.listQueues = listQueues;