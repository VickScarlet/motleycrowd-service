import MiniClient from './miniclient.js';

const clientConfig = {
    session: {
        // host: 'scarlet-mini',
        host: '127.0.0.1',
        // host: '192.168.50.221',
        port: 1919,
        protocol: 'ws',
    },
};

const count = 119;
global.clients = new Array(count).fill(1).map(()=>new MiniClient(clientConfig));
console.debug('client %d start', count);
const start = async client => {
    await client.initialize();
    await client.delay(1000, 5000);
    await client.user.guest();
    await client.delay(500, 5000);
    await client.game.pair(Math.random() > 0.9?10:100);
}
for(const client of clients) {
    await client.delay(0, 100);
    start(client);
}
console.debug('client %d paid', count);