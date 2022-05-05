import API from './api/index.js';
import Database from './database/index.js';
import Session from './session/index.js';
import Core from './module/core.js'

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


const core = new Core();
await core.initialize();

const session = new Session({
    handle: (...args) => core.cmd(...args),
});

$.registerAPI('send', (uuid, data) => session.send(uuid, data))
$.registerAPI('broadcast', data => session.broadcast(data));

session.start({
    port: 3000, 
    router: {
        '/' : './client/public', 
        '/src': './client/src'
    },
})

global.$session = session;