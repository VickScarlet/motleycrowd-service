import './global.function.js';
import errorcode from './errorcode.js';
import API from './api/index.js';
import Database from './database/index.js';
import Session from './session/index.js';
import Core from './module/core.js'

globalThis.$err = errorcode;
globalThis.$ = globalThis.$api = API;

const db = new Database({
    connection: {
        host: '127.0.0.1',
        port: 27017,
        dbName: 'test',
    }
});

globalThis.$db = db;
await db.initialize();
$.registerAPI('dbModel', model => db.model(model));

const core = new Core();
globalThis.$core = core;
await core.initialize();

const session = new Session({
    handle: (type, ...args) => {
        switch(type) {
            case 'message':
                return core.cmd(...args);
            case 'close':
                return core.user.logout(args[0]);
            case 'error':
            default:
                return;
        }
    }
});
globalThis.$session = session;

$.registerAPI('send', (uuid, data) => session.send(uuid, data))
$.registerAPI('broadcast', data => session.broadcast(data));

session.start({
    port: 3000, 
    router: {
        '/' : './client/public', 
        '/src': './client/src'
    },
});
