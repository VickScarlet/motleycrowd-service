import MiniClient from './miniclient.js';

const clientConfig = {
    session: {
        host: '127.0.0.1',
        port: 1919,
        protocol: 'ws',
    },
};

global.clients = new Array(19999).fill(1).map(()=>new MiniClient(clientConfig));
await Promise.all(clients.map(async c=>{
    await c.initialize();
    await c.user.guest();
    await c.game.pair(100);
}));