import {readFile} from 'fs/promises';
import './global.function.js';
import errorcode from './errorcode.js';
import Core from './module/index.js';
import Question from './question/index.js';

globalThis.$err = errorcode;
globalThis.$ = globalThis.$api = {};

console.info('[System]', 'initializing...');
const core = new Core({
    database: {
        connection: {
            host: '127.0.0.1',
            port: 27017,
            dbName: 'test',
        }
    },
    session: {
        host: '::',
        port: 1919,
    },
    user: {},
    game: {},
    commander: {},
});
globalThis.$core = core;
await core.initialize();
console.info('[System]', 'ok.');

console.info('[System|question]', 'initializing...');
const question = new Question({
    questions: JSON.parse(await readFile('data/questions.json', 'utf8')),
});
globalThis.$question = question;
await question.initialize();
$.randomQuestions = (...args)=>question.randomQuestions(...args);
console.info('[System|question]', 'ok.');
