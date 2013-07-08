var chai = require('chai');
global.expect = chai.expect;
global.assert = chai.assert;
global.should = chai.should();

var Q = require('Q');

var support = global.support = module.exports = {
	getSQS: function(){
		var sqs = require('..');
		return sqs(process.env.SQS_TEST_ACCESS_KEY_ID,
			process.env.SQS_TEST_SECRET_ACCESS_KEY,
			process.env.SQS_TEST_REGION);
	},
	clearQueue:function(queue){
    var defer = Q.defer();
    function nextBatch(){
      queue.nextMessages(10,{pollDuration:'0 seconds'}).then(function(messages){
        if(messages.length == 0){
          defer.resolve();
        }else{
          var all = messages.map(function(message){
            return message.delete();
          });
          Q.all(all).then(function(){
            nextBatch();
          });
        }
      });      
    }
    nextBatch();
    return defer.promise;
  }
}