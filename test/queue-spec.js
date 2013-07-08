
var Q = require('Q');
describe('a Queue named test3', function(){
	var queue,
		client = support.getSQS();

	beforeEach(function(done){
		(queue = client.createQueue('test3')).then(done,done).done();
	});

	it('sends and receives a message', function(done){
		support.clearQueue(queue).then( 
			function(){
				return queue.send({hello:'there'}).then(
					function(){ 
						return queue.nextMessage();
					}
				).then(
					function(message){ 
						expect(message).to.exist;  
						expect(message.body).to.deep.equal({hello:'there'});
						return message;
					}
				).then(
					function(message){ 
						return message.delete();
					}
				).then(
          function(){ 
            return queue.nextMessages(10, {pollDuration:1}).then(function(messages){ 
              expect(messages).to.have.length(0);
              done();
            });
          }
        ).then(null, function(err){ 
          done(err);
        }).done();
	   }
    ).fail(done).done();
  });

  it('receives a batch of messages', function(done){
    var messages = [{
      what:'bacon',
      awesome:true
    },{
      what:'republicans',
      awesome:false
    },{
      what:'cats',
      awesome:true
    }];

    support.clearQueue(queue).then(function(){
      return Q.allSettled(messages.map(function(message){
        return queue.send(message);
      }));
    }).then(function(results){
      results.forEach(function(res){
        if(res.reason){
          assert.fail(res.reason);
        }
      });
      return queue.nextMessages(10, {pollDuration:'1 second'});
    }).then(function(messages){
      expect(messages).to.exist;
      expect(messages).to.be.instanceOf(Array);
      expect(messages).to.have.length(3);
      function msgAbout(what){
        for(var i in messages){
          if(messages[i].body.what == what)
            return messages[i];
        }
      }
      function expectMessage(what, awesome){
        var m = msgAbout(what);
        assert.ok(m, 'expected a message about ' + what);
        assert.equal(m.body.awesome, awesome, 'expected ' + what + 
          (awesome ? ' to be totally awesome, but it was lame??' : ' to be totally lame, but it was awesome??'));
        return expectMessage;
      }
      expectMessage('bacon', true)('republicans', false)('cats', true);
      return Q.all(messages.map(function(m){
        return m.delete();
      }));
    }).then(function(){
      done();
    },function(err){
      done(err);
    });
  });
})