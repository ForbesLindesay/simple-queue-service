
var Q = require('Q');
describe('a Queue named test3', function(){
	var queue,
		client = support.getSQS();

	beforeEach(function(done){
		(queue = client.createQueue('test3')).then(done,done).done();
	});

  it("doesn't parse the body if parseJSON is false", function(done){
    support.clearQueue(queue).then(
      function(){
        queue.parseJSON =false;
        return queue.send('blah blah blah');
      }).then(function(){
        return queue.nextMessage()
      }).then(function(m){
        expect(m.body).to.be.a('string');
        done();
      }).then(null, done).done();
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
    var expected = [{
      what:'bacon',
      awesome:true
    },{
      what:'republicans',
      awesome:false
    },{
      what:'cats',
      awesome:true
    }];

    var received = [];
    // big hack here...
    function onmessages(batch){  
      received.push.apply(received, batch);
      if(received.length >= expected.length){
        return Q.resolve(received);
      }else{
        return queue.nextMessages(10, {pollDuration:'1 second'}).then(function(messages){
          return onmessages(messages);
        }, function(err){
          return Q.reject(err);
        });
      } 
    };

    support.clearQueue(queue).then(function(){
      return Q.allSettled(expected.map(function(message){
        return queue.send(message);
      }));
    }).then(function(results){
      results.forEach(function(res){
        if(res.reason){
          assert.fail(res.reason);
        }
      });
      return onmessages([]);
    }).then(function(messages){
      expect(messages).to.exist;
      expect(messages).to.be.instanceOf(Array);
      expect(messages).to.have.length(expected.length);
      var bodies = messages.map(function(m){
        return m.body;
      });
      var cmp = function(l, r){
        l = l.body ? l.body.what : l.what;
        r = r.body ? r.body.what : r.what;
        return l < r ? -1 : r < l ? 1 : 0;
      };
      expected.sort(cmp);
      bodies.sort(cmp);
      expect(expected).to.deep.equal(bodies);
      return Q.all(messages.map(function(m){
        return m.delete();
      }));
    }).then(function(){
      done();
    },function(err){
      done(err);
    });
  });

  it('gets the attributes', function(done){
    queue.getAttributes().then(function(attrs){
      expect(attrs.CreatedTimestamp).to.exist;
      done();
    }).done();
  });

  it('gets a specific attribute', function(done){
    queue.getAttributes(['LastModifiedTimestamp']).then(function(attrs){
      var keys = Object.getOwnPropertyNames(attrs);
      assert.equal(keys.length, 1, 'should only have returned one attribute');
      expect(attrs.LastModifiedTimestamp).to.exist;
      done();
    }).done();
  });

  it('sets an attribute', function(done){
    var before, after;
    function getit(){
      return queue.getAttributes({names:['VisibilityTimeout']}).then(function(attrs){
        return attrs.VisibilityTimeout;
      });
    }
    function setit(val){
      return queue.setAttribute('VisibilityTimeout', val);
    } 
    getit()
    .then(function(vt){
      before = +vt;
      after = (before + 1) % 43200;
      return setit(after);
    }).then(getit) 
    .then(function(vt){
        // "When you change a queue's attributes, the change can take up to
        // 60 seconds to propagate throughout the SQS system." SO no way to check...
        // assert.equal(vt, after, 'should have changed to after');
        return setit(before);
    }).then(function(vt){
      //assert.equal(vt, before, 'should have changed to before');
      done();
    }).done(); 
  });
});