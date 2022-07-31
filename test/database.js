import assert from 'assert';
import Database from '../src/module/database/index.js';

describe('Database', () => {
    const database = new Database(null, {
        host: '127.0.0.1',
        port: 27017,
        dbName: 'test-database',
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
    });
    before(() => database.initialize());
    after(() => database.shutdown());
    describe('#kvdata', () => {
        it('getset', async () => {
            const randomValue = Math.floor(Math.random()*1000);
            await database.kvdata.set('randomValue', randomValue);
            const getValue = await database.kvdata.get('randomValue');
            assert.equal(getValue, randomValue);
        });
    });

    describe('#score', () => {
        it('set and sortedList', async () => {
            await database.score.set('0', 2);
            await database.score.set('1', 9);
            await database.score.set('2', 0);
            await database.score.set('3', 3);
            await database.score.set('4', 7);
            await database.score.set('5', 4);
            await database.score.set('6', 8);
            await database.score.set('7', 6);
            await database.score.set('8', 1);
            await database.score.set('9', 5);
            const sortedList = await database.score.sortedList();
            assert.deepEqual(sortedList, [
                {uid: '1', score: 9},
                {uid: '6', score: 8},
                {uid: '4', score: 7},
                {uid: '7', score: 6},
                {uid: '9', score: 5},
                {uid: '5', score: 4},
                {uid: '3', score: 3},
                {uid: '0', score: 2},
                {uid: '8', score: 1},
                {uid: '2', score: 0},
            ]);
        });
    });
});