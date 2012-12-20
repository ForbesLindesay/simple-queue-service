var utils = require('./utils');
var getSQS = utils.getSQS;
var seconds = utils.seconds;
var bytes = utils.bytes;
var call = utils.call;

var debug = require('debug')('SQS:Message');

module.exports = Message;
function Message(queue, data) {
  if (!(this instanceof Message)) return new Message(queue, data);
  this.body = JSON.parse(data.Body);
  Object.defineProperty(this, '_handle',{enumerable: false, configurable: false, writable: false, 
    value: data.ReceiptHandle});
  Object.defineProperty(this, '_queue',{enumerable: false, configurable: false, writable: false, 
    value: queue});
  var attributes = data.Attribute;
  if (!Array.isArray(attributes)) {
    attributes = attributes ? [attributes] : [];
  }
  var self = this;
  attributes.forEach(function (attr) {
    switch(attr.Name) {
      case 'SenderId':
        self.sender = attr.Value;
        break;
      case 'SentTimestamp':
        self.sent = new Date(+attr.Value);
        break;
      case 'ApproximateReceiveCount':
        self.receiveCount = +attr.Value;
        break;
      case 'ApproximateFirstReceiveTimestamp':
        self.firstRecieved = new Date(+attr.Value);
        break;
      default:
        self[attr.Name] = attr.Value;
    }
  });
}

Message.prototype.delete = function () {
  return call(this._queue, 'DeleteMessage', {ReceiptHandle: this._handle});
};
Message.prototype.extendTimeout = function (time) {
  time = seconds(time, 'time', 0, 43200);
  return call(this._queue, 'ChangeMessageVisibility', {ReceiptHandle: this._handle, VisibilityTimeout: time});
};