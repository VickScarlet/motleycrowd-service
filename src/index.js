import './global.function.js';
import Core from './module/index.js';

const core = new Core({
    database: {
        host: '127.0.0.1',
        port: 27017,
        dbName: 'test-motleycrowd',
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
    question: {
    },
    session: {
        host: '::',
        port: 1919,
    },
    user: {
        authLimit: 5000,
    },
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
});
await core.initialize();