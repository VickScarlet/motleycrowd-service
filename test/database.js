import { MongoClient } from 'mongodb';

// Connection url
const url = 'mongodb://127.0.0.1:27017';
// Connect using MongoClient
const client = await MongoClient.connect(url, {
    useNewUrlParser: true,
});

const db = new Proxy(
    client.db('test-database'), {
    get(target, prop) {
        if(target[prop]) return target[prop];
        return target.collection(prop);
    }
})

db.asset.updateOne(
    { uid: '1005' },
    { $inc: {
        'assets.money.m0' : 10,
        'assets.money.m1' : 100,
    } },
    { upsert: true }
);



debugger