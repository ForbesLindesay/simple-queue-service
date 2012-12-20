# simple-queue-service

  Simple interface to amazon's simple queue service

## Installation

    npm install simple-queue-service

## Usage

```javascript
var sqs = require('simple-queue-service');
var client = sqs('SQS_ACCESS_KEY', 'SQS_SECRET_KEY', 'SQS_REGION');
var queue = client.createQueue('my-queue');
queue.send({foo: 'bar'});
queue.nextMessage()
  .then(function (res) {
    console.log(res.body.foo);
    res.delete();
  });
```

## API

  All time spans can be passed either as a number of seconds, or any string accepted by [ms](https://github.com/guille/ms.js) (e.g. `'1 minute' => 60 seconds` or `'2 minutes' => 120 seconds`)

### Client('SQS_ACCESS_KEY', 'SQS_SECRET_KEY', 'SQS_REGION')

  Creates a new client for the amazon simple queue service.  SQS_REGION will default to 'us-east-1'.  The regions translate as follows

    'us-east-1' =>  Virginia
    'us-west-1' => N. California
    'us-west-2' => Oregon
    'eu-west-1' => Ireland
    'ap-southeast-1' => Singapore
    'ap-northeast-1' => Tokyo

  You can if you prefer set any of the three arguments by simply setting an environment variable of the same name (and arguments passed in will override any environment variables).

#### Client#createQueue(name, options)

Arguments:

   - **name** - string parameter containing the name of the queue to create.
   - **options**
     - **delay** - Delay all messages in the queue by a time.
     - **messageRetention** - The amount of time a message remains in the queue if you don't read it.
     - **pollDuration** - The amount of time to long poll for (you should rarely need to touch this, except in testing things).
     - **visibilityTimeout** - How long messages stay invisible before assuming you've crashed and attempting to re-deliver them.
     - **maxMessageSize** - The maximum message size in bytes (you probably don't want to touch this).  You can also use any of the strings accepted by [bytes](https://github.com/visionmedia/bytes.js) such as `'1kb' => 1024 bytes`

Returns:

  This method imediately returns a new Queue object.  If something goes wrong with creating the queue, this resulting queue will 'throw' errors when you try and post/recieve messages to/from it.

  The result is also a [promise](http://promises-aplus.github.com/promises-spec/), which allows you to wait until it's fully initialized if you prefer.

#### Client#getQueue(name)

Arguments:

   - **name** - string parameter containing the name of the queue you want to access, or if you have it, the full url or id of the queue (including your 12 digit amazon ID number).

Returns:

  The same as for `createQueue` except that in the case you provide the full id, it won't be a [promise](http://promises-aplus.github.com/promises-spec/).

#### Client#listQueues(prefix)

Arguments:

   - **prefix** - Optional prefix specifier to filter the queues by, will return a maximum of 1000 queues.

Returns:
  
  A [promise](http://promises-aplus.github.com/promises-spec/) for an Array of Queue objects.  They are never promises.

## Queue(name, 'SQS_ACCESS_KEY', 'SQS_SECRET_KEY', 'SQS_REGION')

  You can use `Client.Queue(name, 'SQS_ACCESS_KEY', 'SQS_SECRET_KEY', 'SQS_REGION')` as an alternative to `Client('SQS_ACCESS_KEY', 'SQS_SECRET_KEY', 'SQS_REGION').getQueue(name)`.

  This also provides access to the prototype of Queue.

### Queue#name

  The name of the queue (not the full identifier).

### Queue#send(message, options)

  Puts a message into the queue

Arguments:

   - **message** - the message to send, it will be JSON serialized.
   - **options**
     - **delay** - make the message invisible for a period of time after it's inserted into the queue.

### Queue#nextMessage(options)

  Gets the next message from the queue.  If there are no available messages, this method will keep polling until there is a message.

Arguments:

   - **options**
     - **visibilityTimeout** - overide the default visibility timeout for the queue
     - **pollDuration** - overide the default poll duration for the queue

Returns:

  A [promise](http://promises-aplus.github.com/promises-spec/) for a Message object.

### Queue#nextMessages(max, options)

  Gets up to 'max' messages from the queue.  It will return an empty array `[]` if there are no messages, rather than continuing to poll.

Arguments:

   - **max** - the maximum number of messages to retreive
   - **options** - see Queue#nextMessage(options)

Returns:

  A [promise](http://promises-aplus.github.com/promises-spec/) for an array of Message objects.

## Message

  Encapsulates a message retrieved from the queue, along with its metadata.

### Message#body
  
  The parsed JSON body of the message.

### Message#sender

  The ID of the message sender.

### Message#sent

  A Date object for when the message was sent.

### Message#firstReceived

  A Date object for when the message was first received (aproximate).

### Message#receiveCount

  The aproximate number of times this message has been received (you probably want to give up if that number's unusually high).

### Message#delete()

  You _MUST_ call this once you're done, so the message does not get re-delivered.  Returns a [promise](http://promises-aplus.github.com/promises-spec/) to indicate success.

### Message#extendTimeout(time)

  Reset the visibilityTimeout to a new value.  Returns a [promise](http://promises-aplus.github.com/promises-spec/) to indicate success.