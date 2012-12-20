var debug = require('debug')('SQS:utils');
var ms = require('ms');
var bts = require('bytes');
var aws = require('aws2js');
var defer = require('promises-a');

function getSQS(accessKey, secretKey, region) {
  accessKey = accessKey || process.env.SQS_ACCESS_KEY;
  secretKey = secretKey || process.env.SQS_SECRET_KEY;
  region = region || process.env.SQS_REGION;
  var sqs = aws.load('sqs', accessKey, secretKey);
  if (region) {
    sqs.setRegion(region);
  }
  return sqs;
}
exports.getSQS = getSQS;

/**
 * ## normalizeError
 *
 * Takes an error as an argument, and throws a better one if the error included a message
 * from the server.
 *
 * @param {Error} err
 */
function normalizeError(err) {
  if (err && err.document && err.document.Error && err.document.Error.Message) {
    var e = new Error(err.document.Error.Message);
    e.name = err.document.Error.Code ? 'SQS:' + err.document.Error.Code : 'SQS:Error';
    throw e;
  } else {
    throw err;
  }
}

/**
 * ## seconds
 * 
 * @param  {string|number} input Either a string like "1 second" or a number of seconds
 * @param  {string=} name        A name to enable validation
 * @param  {number=} min         The minimum number of seconds
 * @param  {number=} max         The maximum number of seconds
 * @return {number}              The number of seconds
 * @api private
 */
function seconds(input, name, min, max) {
  if (typeof input === 'string') input = Math.floor(ms(input) / 1000);
  if (name && (input < min || input > max)) 
    throw new Error(name + ' was out of range, must be between ' 
      + ms(min*1000, {long:true}) + ' and ' + ms(max*1000, {long:true}));
  return input;
}
exports.seconds = seconds;

/**
 * ## bytes
 * 
 * @param  {string|number} input Either a string like 1MB or a number of bytes
 * @param  {string=} name        A name to enable validation
 * @param  {number=} min         The minimum number of bytes
 * @param  {number=} max         The maximum number of bytes
 * @return {number}              The number of bytes
 * @api private
 */
function bytes(input, name, min, max) {
  if (typeof input === 'string') input = bts(input);
  if (name && (input < min || input > max)) 
    throw new Error(name + ' was out of range, must be between ' 
      + bytes(min) + ' and ' + bytes(max));
  return input;
}
exports.bytes = bytes;


function call(client, action, query) {
  debug(action);
  debug(client._init);
  debug(client._sqs);

  var resolver = defer();
  var promise = resolver.promise;

  if (client._init && typeof client._init.then === 'function') {
    debug('SUSPEND: ' + action);
    return client._init.then(done);
  } else {
    return done();
  }
  function done() {
    debug('EXECUTE: ' + action);
    client._sqs.request(action, query, function (err, res) {
      if (err) resolver.reject(err);
      else resolver.fulfill(res);
    });
    return promise.then(undefined, normalizeError);
  }
}
exports.call = call;