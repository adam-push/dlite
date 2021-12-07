const diffusion = require('diffusion');
const TopicSpecification = diffusion.topics.TopicSpecification;
const TopicType = diffusion.topics.TopicType;

async function _sleep(delay) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}

async function _connect(options) {
    let session = await diffusion.connect(options)
        .catch((err) => {
            console.log('ERROR CONNECTING TO DIFFUSION:', err);
            if(options.onError) {
                options.onError(err);
            }
        });

    while(!session || session.isClosed()) {
        await _sleep(1000);
        session = await _connect(options)
            .catch((err) => {
                console.log('ERROR CONNECTING TO DIFFUSION:', err);
                if(options.onError) {
                    options.onError(err);
                }
            });
    }

    return session;
}

function _setupCallbacks(dliteSession, session, options) {
    if(session) {
        if(options.onConnect) {
            console.log('CONNECTED');
            options.onConnect();
        }

        session.on('disconnect', (reason) => {
            console.log('DISCONNECTED (RECONNECTING)', reason);
            if(options.onReconnecting) {
                options.onReconnecting(reason);
            }
        });

        session.on('close', async (reason) => {
            console.log('CLOSED', reason);
            let failover = true;
            if(options.onClose) {
                let rc = options.onClose(reason);
                if(rc !== undefined) {
                    failover = Boolean(rc);
                }
            }
            console.log('DO FAILOVER:', failover);
            if(failover) {
                let new_session = await _connect(options); // TODO: Does not affect the returned dliteSession !!!
                _setupCallbacks(dliteSession, new_session, options);
                dliteSession.setSession(new_session);
            }
        });

        session.on('reconnect', () => {
            console.log('RECONNECTED');
            if(options.onReconnected) {
                options.onReconnected();
            }
        });
    }
}

async function connect({url            = 'ws://localhost:8080',
                        username       = null,
                        password       = null,
                        onError        = null,
                        onConnect      = null,
                        onClose        = null,
                        onReconnecting = null,
                        onReconnected  = null} = {}) {

    let ls = new dlitesession();

    let options = {};

    let u = new URL(url);
    if(u.host) { options.host = u.host };
    if(u.port) { options.port = u.port };
    options.secure = (u.protocol === 'wss:' || u.protocol === 'https');

    if(username) { options.principal = username; }
    if(password) { options.credentials = password; }

    options.onError = onError;
    options.onConnect = onConnect;
    options.onClose = onClose;
    options.onReconnecting = onReconnecting;
    options.onReconnected = onReconnected;
    
    let session = await _connect(options);
    _setupCallbacks(ls, session, options);
    ls.setSession(session);

    return ls;
}

class dlitesession {
    constructor(session) {
        this.session = session;
        this.specification = new TopicSpecification(TopicType.STRING);
        this.streams = {};
    }

    setSession(session) {
        this.session = session;
        console.log('SET SESSION TO ' + this.id());
    }
    
    id() {
        return this.session.sessionID;
    }
    
    async publish(topic, data) {
        if(typeof data === 'object') {
            data = JSON.stringify(data);
        }

        this.session?.topicUpdate.set(topic, diffusion.datatypes.string(), data)
            .then((result) => {
                return result;
            })
            .catch(err => {
                this.session?.topicUpdate.set(topic, diffusion.datatypes.string(), data, { specification : this.specification });
            });
    }

    async subscribe(selector, callback) {
        if(! callback) {
            throw new Error('Callback not given in subscribe call');
        }
        this.streams[selector] = (this.session?.addStream(selector, diffusion.datatypes.string())
                                  .on('value', (path, spec, newValue, oldValue) => {
                                      callback(path, newValue);
                                  }));
        return this.session?.select(selector);
    }

    async unsubscribe(selector) {
        delete this.streams[selector];
        return this.session?.unsubscribe(selector);
    }
    
    async addTopic(topic, depth) {
        switch(depth) {
        case undefined:
            return this.session?.topics.add(topic,
                                           this.specification);
        case 0:
            return this.session?.topics.add(topic,
                                           new TopicSpecification(TopicType.STRING, {
                                               DONT_RETAIN_VALUE : 'TRUE'
                                           }));
        default:
            return this.session?.topics.add(topic,
                                           new TopicSpecification(TopicType.TIME_SERIES, {
                                               TIME_SERIES_EVENT_VALUE_TYPE : 'string',
                                               TIME_SERIES_RETAINED_RANGE   : 'limit ' + depth
                                           }));
        }
    }

    async removeTopic(selector) {
        return this.session?.topic.remove(selector);
    }

    async close() {
        let rc = this.session?.close();
        this.session = null;
        return rc;
    }
}

exports.connect = connect;
