var chai = require('chai');
var U = require('../lib/utils');
var Promise = require('promise');
exports.expect = chai.expect;
exports.assert = chai.assert;

// quick hack to avoid confusion between the two utils
U.defaults(exports, U);

function getSQS(){
		var sqs = require('..');
		return sqs(process.env.SQS_TEST_ACCESS_KEY_ID,
			process.env.SQS_TEST_SECRET_ACCESS_KEY,
			process.env.SQS_TEST_REGION);
}
exports.getSQS = getSQS;


function clearQueue(queue){
  var defer = U.defer();
  function nextBatch(){
    queue.nextMessages(10,{pollDuration:'0 seconds'}).then(function(messages){
      if(messages.length == 0){
        defer.resolve();
      }else{
        var all = messages.map(function(message){
          return message.delete();
        });
        return Promise.all(all).then(function(){
          nextBatch();
        });
      }
    });      
  }
  nextBatch();
  return defer.promise;
}

exports.clearQueue = clearQueue;

var queuesToDelete = [];

function createTmpQueue(client, done, options){
  var queue =  client.createQueue("yes-please-delete-me-" + require('uuid').v4(), options);
  queue.then(function(){
    done();
  }, done);
  return queue;
}

exports.createTmpQueue = createTmpQueue;

function deleteTmpQueues(client){
  return client.listQueues('yes-please-delete-me-').then(function(queues){
    return Promise.all(queues.map(function(q){
      return q.delete().then(U.resolution, U.resolution);
    }))
  }); 
}

exports.deleteTmpQueues = deleteTmpQueues;