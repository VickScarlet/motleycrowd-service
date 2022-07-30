import {readFile} from 'fs/promises';
import './global.function.js';
import errorcode from './errorcode.js';
import Core from './module/index.js';
import Question from './question/index.js';

process.title = 'Metley Crowd Service';

globalThis.$err = errorcode;
globalThis.$ = globalThis.$api = {};


console.info('[System]', 'initializing...');

console.info('[System|question]', 'initializing...');
const question = new Question({
    questions: JSON.parse(await readFile('data/questions.json', 'utf8')),
});
globalThis.$question = question;
await question.initialize();
$.randomQuestions = (...args)=>question.randomQuestions(...args);
console.info('[System|question]', 'ok.');

const core = new Core({
    database: {
        host: '127.0.0.1',
        port: 27017,
        dbName: 'test',
        model: {
            KVData: {
                collection: 'kvdata',
            },
            User: {
                collection: 'user',
            },
            Game: {
                collection: 'game',
            },
            Score: {
                collection: 'score',
            },
        }
    },
    session: {
        host: '::',
        port: 1919,
    },
    user: {},
    game: {
        pair: {
            10: {
                limit: 10,
            },
            100: {
                limit: 100,
            }
        }
    },
    commander: {},
});
globalThis.$core = core;
await core.initialize();
console.info('[System]', 'ok.');