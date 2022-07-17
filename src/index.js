import {readFile} from 'fs/promises';
import './global.function.js';
import errorcode from './errorcode.js';
import API from './api/index.js';
import Database from './database/index.js';
import Session from './session/index.js';
import Core from './module/core.js';
import Question from './question/index.js';

globalThis.$err = errorcode;
globalThis.$ = globalThis.$api = API;

console.info('[System]', 'initializing...');
console.info('[System|database]', 'initializing...');
const db = new Database({
    connection: {
        host: 'scarlet-mini',
        port: 27017,
        dbName: 'test',
    }
});

globalThis.$db = db;
await db.initialize();
$.registerAPI('dbModel', model => db.model(model));
console.info('[System|database]', 'ok.');

console.info('[System|core]', 'initializing...');
const core = new Core();
globalThis.$core = core;
await core.initialize();
console.info('[System|core]', 'ok.');

console.info('[System|question]', 'initializing...');
const question = new Question({
    questions: JSON.parse(await readFile('data/questions.json', 'utf8')),
});
globalThis.$question = question;
await question.initialize();
$.registerAPI('randomQuestions', (...args)=>question.randomQuestions(...args));
console.info('[System|question]', 'ok.');

console.info('[System|session]', 'initializing...');
const session = new Session({
    handle: (type, ...args) => {
        switch(type) {
            case 'connected':
                return ({
                    version: "0.0.1"
                });
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

$.registerAPI('close', (uuid, code, reason) => session.close(uuid, code, reason))
$.registerAPI('send', (uuid, data) => session.send(uuid, data))
$.registerAPI('broadcast', data => session.broadcast(data));

session.start({
    port: 1919,
    router: {
        '/' : './client/public',
        '/src': './client/src'
    },
});
console.info('[System|session]', 'ok.');

console.info('[System]', 'ok.');