import Database from '../src/module/database/index.js';

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
await database.initialize();

console.debug('===kvdata set===');
console.debug(await database.kvdata.set('test', 'test'));
console.debug(await database.kvdata.set('A', 'A'));
console.debug(await database.kvdata.set('B', {'B': 'B'}));
console.debug(await database.kvdata.set('C', [27391, 'C']));
console.debug(await database.kvdata.set('D', 'D'));
console.debug('===kvdata set===');

console.debug('===score set===');
console.debug(await database.score.set('0', Math.floor(Math.random()*100)));
console.debug(await database.score.set('1', Math.floor(Math.random()*100)));
console.debug(await database.score.set('2', Math.floor(Math.random()*100)));
console.debug(await database.score.set('3', Math.floor(Math.random()*100)));
console.debug(await database.score.set('4', Math.floor(Math.random()*100)));
console.debug(await database.score.set('5', Math.floor(Math.random()*100)));
console.debug(await database.score.set('6', Math.floor(Math.random()*100)));
console.debug(await database.score.set('7', Math.floor(Math.random()*100)));
console.debug(await database.score.set('8', Math.floor(Math.random()*100)));
console.debug(await database.score.set('9', Math.floor(Math.random()*100)));
console.debug('===score set===');

const sortedList = await database.score.sortedList();
console.table(sortedList);


console.debug('===user create===');
// console.debug(await database.user.create('4', '4', '4'));
// console.debug(await database.user.create('3', '3', '3'));
console.debug('===user create===');

// global.database = database;
await database.close();