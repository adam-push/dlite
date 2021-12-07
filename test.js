const dlite = require('./dlite.js');

function onError(err) {
    console.log('Error:', err);
}

function onConnect() {
    console.log('Connected');
}

function onClose(reason) {
    console.log('Closed:', reason);
    return false;
}

function onReconnecting(reason) {
    console.log('Reconnecting', reason);
}

function onReconnected() {
    console.log('Reconnected');
}

async function run() {
    let session = await dlite.connect({url            : 'ws://localhost:8090',
                                      username       : 'admin',
                                      password       : 'password',
                                      onError        : onError,
                                      onConnect      : onConnect,
                                      onClose        : onClose,
                                      onReconnecting : onReconnecting,
                                      onReconnected  : onReconnected
                                     });
    console.log('session=', session.id());

    session.addTopic('foo/regular_topic');
    
    session.addTopic('bar/dont_retain_value', 0)
        .catch(err => { console.log(err); });
    session.addTopic('bar/timeseries_1', 1)
        .catch(err => { console.log(err); });
    session.addTopic('bar/timeseries', 25)
        .catch(err => { console.log(err); });

    let counter = 0;
    let json = { foo : 'bar', counter : counter };
    setInterval(async () => {
        session.publish('foo/bar', 'Hello, world: ' + counter);
        session.publish('foo/counter', counter);
        json.counter = counter;
        session.publish('foo/json', json);

        session.publish('bar/timeseries', 'Count=' + counter);
        session.publish('bar/timeseries_1', 'Count=' + counter);
        session.publish('bar/dont_retain_value', 'Count=' + counter);
        
        counter++;
    }, 1000, 1000);


    session.subscribe('?foo//', (topic, data) => {
        console.log('Got update on', topic, ':', data);
    });

    session.subscribe('?bar//', (topic, data) => {
        console.log('Got update on', topic, ':', data);
    });

    setTimeout(async() => {
        await session.close();
    }, 1000 * 10);
}

run();
