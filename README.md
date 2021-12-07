# dlite
Simplified "lite" library for Diffusion, in JavaScript


This library attempts to provide a simplified API for common tasks with Diffusion. It is *not* a replacement for the full API.

## Usage

```
const dlite = require('./dlite.js');
```

## Connecting to Diffusion

When connecting to Diffusion in the first instance, this API will keep retrying the connection until it is successful, with a 1 second delay between reconnection attempts.

As with the standard API, it will automatically attempt reconnection if it is temporarily disconnected. However, if the session is closed it will try to make a new connection for you (e.g. the server was restarted, or the user is moved to a new server without session replication enabled). In the latter case, subscriptions are automatically reissued.

```
let session = await dlite.connect({ options });
```

Where options are:

| Option         | Description                                                              | Default             |
|----------------|--------------------------------------------------------------------------|---------------------|
| url            | URL to use when connecting to Diffusion                                  | ws://localhost:8080 |
| username       | Username used when connecting                                            |                     |
| password       | Password used when connecting                                            |                     |
| onError        | Callback when an error is reported by the session                        |                     |
| onConnect      | Callback when a new session is connected                                 |                     |
| onClose        | Callback when a session is closed                                        |                     |
| onReconnecting | Callback when a session is attempting to reconnect an existing session   |                     |
| onReconnected  | Callback when a session has successfully reconnected an existing session |                     |


### onError(err)
Callback to use if you want notification of connection errors.

### onConnect()
Called when a new session is created.

### onClose(reason)
Called if a session is closed. Returning `false` from this function will prevent any automatic attempts to establish a new connection.

### onReconnecting(reason)
Called when the session is disconnected from the server, but the client is trying to reestablish the connection so that the session may continue.

### onReconnected()
Called when a reconnection attempt was successful and the session is retained.

## Topic management (adding, removing, publishing, subscribing)

### publish(topic, data)
All topics created using this API are of STRING type. The data can be of any type, with JSON objects and primitive types are automatically converted to their string representation before the topic is updated. Returns a Promise.

### addTopic(topic, [depth])
If depth is not specified, a regular STRING topic is created.

If depth is 0, a STRING topic with the property DONT_RETAIN_VALUE is created.

If depth is >0, a TIME_SERIES topic (of STRING type) is created, with TIME_SERIES_RETAINED_RANGE equal to the depth. Note that a depth of 1 will still create a time series topic.

Returns a Promise.

### removeTopic(selector)
Removes a topic or multiple topics matching a selector. Returns a Promise.

### subscribe(selector, callback)
Subscribes the client to all topics that match the selector. When data is received on any matching topic, the callback is invoked. Returns a Promise.

The callback is defined as `callback(topic, data)` where data is always a string.

### unsubscribe(selector)
Unsubscribes the client from the topics that match the selector. Returns a Promise.

## Other methods

### id()
Returns the Session ID of the current session.

### close()
Closes the current session.

### session()
Get the underlying Diffusion session object.
