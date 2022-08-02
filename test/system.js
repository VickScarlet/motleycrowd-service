import assert from 'assert';
import '../src/global.function.js';
import Logger from '../src/logger.js';
import Core from '../src/module/index.js';
import MiniClient from '../client/miniclient.js';
import { MongoClient } from 'mongodb';

describe('System', () => {
    const host = '127.0.0.1';
    const port = 27017;
    const dbName = 'test-system';
    const listen = 1919;
    const dropDatabase = async () => {
        const dbClient = new MongoClient(`mongodb://${host}:${port}`, {useNewUrlParser: true});
        await dbClient.connect();
        await dbClient.db(dbName).dropDatabase();
        await dbClient.close();
    }
    const time = async t => new Promise(resolve => setTimeout(resolve, t));
    global.logger = new Logger({display: false});
    const core = new Core({
        database: {
            host, port, dbName,
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
            port: listen,
        },
        user: {
            authLimit: 5000,
        },
        game: {
            types: {
                10: {
                    limit: 10,
                },
                100: {
                    limit: 100,
                }
            }
        },
    });
    const username = "test-system";
    const password = "test-system";
    const clientConfig = {session: {host: '127.0.0.1', port: listen}};
    before(async ()=>{
        await dropDatabase();
        await core.initialize();
    });
    after(async ()=>{
        await core.shutdown();
        await dropDatabase();
    });
    describe('#session', () => {
        it('connect', async () => {
            const client = new MiniClient(clientConfig);
            await client.initialize();
            await client.close();
        });
    });
    describe('#user', () => {
        it('register', async () => {
            const client = new MiniClient(clientConfig);
            await client.initialize();
            await client.user.register(username, password);
            await client.close();
        });
        it('authenticate and logout', async () => {
            const client = new MiniClient(clientConfig);
            await client.initialize();
            await client.user.authenticate(username, password);
            await client.user.logout();
            await client.close();
        });
        it('guest', async () => {
            const client = new MiniClient(clientConfig);
            await client.initialize();
            await client.user.guest();
            await client.close();
        });
    });
    describe('#game', async () => {
        const client = new MiniClient(clientConfig);
        const clients = new Array(100)
            .fill(1)
            .map(()=>new MiniClient(clientConfig));
        it('pair authenticated', async ()=>{
            await client.initialize();
            await client.user.authenticate(username, password);
            await client.game.pair(100);
        }).timeout(3000);
        it('pair guest 100', () => Promise.all(clients.map(async c=>{
            await c.initialize();
            await c.user.guest();
            await c.game.pair(100);
        }))).timeout(3000);
        it('user disconnect', () => Promise.all([client, ...clients].map(c=>c.close())));
    });
});