var debug = require('debug')('SQS:Queue');

var Message = require('./message');

var utils = require('./utils');
var getSQS = utils.getSQS;
var seconds = utils.seconds;
var bytes = utils.bytes;
var call = utils.call;
var readOnlyProperty = utils.readOnlyProperty;
var requireProperties = utils.requireProperties;
var defaults = utils.defaults;

function defaultQueueOptions(options){
  options = defaults(options || {}, {
    accessKey:process.env.AWS_ACCESS_KEY_ID,
    secretKey:process.env.AWS_SECRET_ACCESS_KEY,
    region:process.env.SQS_REGION,
    parseJSON:true,
    base64:false
  });
  
  requireProperties(options, [
    'accessKey',
    'secretKey',
    'region'
   ],
   "Missing required Queue option #{name}"
  );
  return options;
  
}

module.exports = Queue;
/**
 * # Queue
 *
 * @param  {string}  queueName Name of the queue, identifier (url) of the queue, 
 *   or a promise for that.
 * @param {object} options Options for the queue.  The following properties are 
 *  supported:
 *  * `accessKey` {string} AWS access key [default: `process.env.AWS_ACCESS_KEY_ID`]
 *  * `secretKey` {string} AWS secret key [default: `process.env.AWS_SECRET_ACCESS_KEY`]
 *  * `region` {string} SQS endpoint region (e.g., us-west-2) [default: `process.env.SQS_REGION`]
 *  * `parseJSON` {boolean} Whether to parse message bodies as JSON [default: `true`]
 *  * `base64` {boolean} Whether message bodies are base64 encoded [default: `false`]
 *  
 * @return {Queue}
 */
function Queue(queueName, options) {
  
  if (!(this instanceof Queue)) return new Queue(queueName, options);
  
  options = defaultQueueOptions(options);

  var self = this;
  readOnlyProperty(this, '_sqs',
    getSQS(
      options.accessKey,
      options.secretKey,
      options.region
    )
  );
  
  readOnlyProperty(this, 'parseMessageBody', messageBodyParser(options));
  
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

/**
 * Get the attributes for this queue.
 * 
 * @param options:
 *  options.names: Names of attributes to get.
 *  options.useCached: If true, use cached value from last call, if available.
 * @return promise for an object of {name:value} pairs.
 */
function getAttributes(names){ 
  var self = this, 
        query = {};
  
  if(typeof names === 'string'){
    names = [names];
  }else if(!(typeof names === 'object' && 
    (names instanceof Array)) ||
    names.length == 0){
    names = ['All'];
  }

  names.forEach(function(name, i){
    query['AttributeName.' + (i + 1)]  = name;
  });
  
  return call(this, 'GetQueueAttributes', query)
    .then(function(res){ 
      var attrs = res.GetQueueAttributesResult.Attribute;
      if(!(attrs instanceof Array)){
        attrs = [attrs];
      }
      var result = {};
      attrs.forEach(function(attr){
        result[attr.Name] = attr.Value;
      });
      return result;
    });

}

Queue.prototype.getAttributes = getAttributes;

/**
 * Sets attributes for this queue.
 * @param key: name of attribute
 * @param value: value of the attribute to set, if key is a string.
 * @retun promise
 */
 function setAttribute(name, value){
    var query = {};
    if(value == null){
      value = '';
    }

    this._attributes = null;

    query['Attribute.Name'] = name;
    query['Attribute.Value'] = value;
    return call(this, 'SetQueueAttributes', query);
 };

Queue.prototype.setAttribute = setAttribute;