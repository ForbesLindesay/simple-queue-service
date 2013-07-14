var utils = require('./utils');
var resolution = utils.resolution;
var rejection = utils.rejection;
var expect = utils.expect;
var assert = utils.assert;
var seconds = utils.seconds;
var Promise = require('promise');


describe('a Queue', function(){
	var queue,
		client = utils.getSQS();
  
  before(function(done){
    utils.deleteTmpQueues(client).then(function(){done();}, done);
  })
  
  after(function(done){
    utils.deleteTmpQueues(client).then(function(){done();},done);
  })
  
	beforeEach(function(done){
    queue = utils.createTmpQueue(client, done);
	});

  describe('with parseJSON==false', function(){
    beforeEach(function(done){
      queue = utils.createTmpQueue(client, done, {parseJSON:false});
    });


    it("doesn't parse the body if parseJSON is false", function(done){
      queue.send('bwah haha').then(function(){
          return queue.nextMessage();
        }).then(function(m){
          expect(m.body).to.be.a('string');
          done();
        }).done();
     });
  });

	it('sends and receives a message', function(done){
    queue.send({hello:'there'})
      .then(queue.nextMessage.bind(queue))
      .then(function(message){ 
				  expect(message).to.exist;  
				  expect(message.body).to.deep.equal({hello:'there'});
				  return message;
				}).then(function(){done();}, done).done(); 
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
    // it takes an indeterminite ammount of time for the change to 
    // take effect, so I really don't see any easy way to test this except
    // to call it and make sure it doesn't error.
    queue.setAttribute('VisibilityTimeout', seconds('30 seconds')).then(function(){
      done();
    }, done).done();
  });
});