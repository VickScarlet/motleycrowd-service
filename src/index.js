import Logger from './logger.js';
import Core from './module/index.js';

globalThis.logger = new Logger({});

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
        host: '127.0.0.1',
        port: 1919,
    },
    user: {
        authLimit: 5000,
    },
    game: {
        types: {
            10: {
                limit: 10,
                pool: 10,
            },
            100: {
                limit: 100,
                pool: 100,
            }
        }
    },
    logger: {
        disable: true,
    }
});
await core.initialize();
global.shutdown = ()=>core.shutdown();
global.core = core;