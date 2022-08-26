import WebSocket from 'ws';
import { v4 as uuidGenerator } from 'uuid';
import { unzipSync } from 'zlib';
import { listRandom } from '../../src/functions/index.js';

class Session {
    constructor({protocol='ws', host, port}, {connect, boardcast, message}) {
        this.#protocol = protocol;
        this.#host = host;
        this.#port = port;
        this.#onconnect = connect;
        this.#callbacks.set(this.#BORDERCAST, boardcast);
        this.#callbacks.set(this.#MESSAGE, message);
    }

    #CONNECT = 0;
    #PING = 1;
    #PONG = 2;
    #MESSAGE = 3
    #REPLY = 4;
    #RESUME = 5;
    #BORDERCAST = 9;

    #protocol;
    #host;
    #port;
    #client = null;
    #callbacks = new Map();
    #online = NaN;
    #delay = NaN;
    #lastping = 0;
    #onconnect;
    #sid;

    get #needping() {
        return Date.now() - this.#lastping > 60000;
    }
    get online() { return this.#online; }
    get delay() { return this.#delay; }

    async start() {
        return this.#connect();
    }

    get #url() {
        if(this.#host) {
            if(this.#port) return `${this.#protocol}://${this.#host}:${this.#port}`;
            return `${this.#protocol}://${this.#host}`;
        }
        return `${this.#protocol}://${window.location.host}`;
    }

    async #ws(onmessage, onclose) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.#url);
            ws.addEventListener('open', _ => resolve(ws));
            ws.addEventListener('error', e => reject(e));
            ws.addEventListener('message', async ({data}) => {
                try {
                    onmessage(JSON.parse(data))
                } catch (e) {
                    onmessage(JSON.parse(unzipSync(data).toString()));
                }
            });
            ws.addEventListener('close', onclose);
        });
    }

    async #connect() {
        return new Promise(async resolve => {
            const client = await this.#ws(
                data => {
                    if(data[0]!==this.#CONNECT)
                        return this.#onmessage(data);
                    const [, info, sid, online] = data;
                    this.#client = client;
                    this.#online = online;
                    this.#sid = sid;
                    this.#onconnect(info, online);
                    resolve();
                },
                ({code, reason}) => this.#onclose(code, reason),
            );
            client.send(JSON.stringify([this.#CONNECT]));
        });
    }

    async #resume() {
        return new Promise(async (resolve, reject) => {
            const client = await this.#ws(
                data => {
                    if(data[0]!==this.#RESUME)
                        return this.#onmessage(data);
                    const [, success, online] = data;
                    this.#online = online;
                    if(!success)
                        return reject (new Error(`RESUME failed`));
                    this.#client = client;
                    resolve();
                },
                ({code, reason}) => this.#onclose(code, reason),
            );
            client.send(JSON.stringify([this.#RESUME, this.#sid]));
        });
    }

    async #onmessage([guid, content, attach]) {
        const callback = index=>{
            if(!this.#callbacks.has(index)) return;
            this.#callbacks.get(index)(content, attach);
            this.#callbacks.delete(index);
        }
        switch(guid) {
            case this.#PING:
                this.#send([this.#PONG]);
                break;
            case this.#PONG:
                callback(this.#PING);
                break;
            case this.#MESSAGE:
            case this.#BORDERCAST:
                this.#callbacks.get(guid)(content, attach);
                break;
            case this.#REPLY:
            default:
                callback(guid);
                break;
        }
    }

    #onclose(code) {
        this.#client = null;
        switch(code) {
            case 3000:
            case 3001:
                return;
        }
        this.#resume();
    }

    #send(data) {
        this.#client.send(JSON.stringify(data));
    }

    close() {
        this.#client.close();
    }

    #ping() {
        return new Promise((resolve, reject) => {
            if(!this.#client) return reject('not connected');
            let called = false;
            const start = Date.now();
            const done = online=>{
                if(called) return;
                called = true;
                const delay = Date.now() - start;
                this.#online = online;
                this.#delay = delay;
                resolve({delay, online});
            }
            this.#callbacks.set(this.#PING, done);
            this.#send([this.#PING]);
        });
    }

    async command(command, data) {
        return new Promise(resolve => {
            const guidF = uuidGenerator();
            const L = guidF.length;
            for(let i = 1; i<=L; i++) {
                const guid = guidF.substring(0, i)
                if(this.#callbacks.has(guid)) continue;
                this.#callbacks.set(guid, ([code, ret])=>{
                    // hook error
                    const success = code !== undefined && !code;
                    if(code) {
                        console.debug('Command error:', code);
                    }
                    resolve({ success, code, data: ret });
                });
                const message = [guid,command];
                if(data!==undefined) message.push(data);
                this.#send(message);
                return;
            }
        });
    }

    async ping() {
        if(this.#client && this.#needping) {
            this.#lastping = Date.now();
            return this.#ping();
        }
        const {delay, online} = this;
        return {delay, online};
    }
}

export default class MiniClient {
    constructor({session}) {
        this.#session = new Session(session, {
            boardcast: data => this.onboardcast?.(data),
            connect: ({version}, online) => this.onconnect?.(version, online),
            message: data => this.onmessage?.(data),
        });
    }
    #session;

    async initialize() {
        await this.#session.start();
    }

    async close() {
        this.#session.close();
    }

    async command(command, data) {
        return this.#session.command(command, data);
    }

    async delay(min, max) {
        const delay = Math.random() * (max - min) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    async onmessage([c,d]) {
        switch(c) {
            case 'game.question':
                // auto answer
                const answer = listRandom(d[2].split(''));
                await this.delay(1000, 10000);
                await this.game.answer(d[0], answer);
                return;
            case 'game.settlement':
                await this.delay(15000, 60000);
                // await this.game.pair(Math.random() > 0.9?10:100);
                await this.game.pair(10);
                return;
            case 'game.user':
            case 'game.ready':
            case 'game.answer':

            default:
                break;
        }
    }

    user = {
        authenticate: (username, password) => this.command('user.authenticate', {username, password}),
        register: (username, password) => this.command('user.register', {username, password}),
        logout: () => this.command('user.logout'),
        guest: () => this.command('user.guest'),
    }

    game = {
        pair: type => this.command('game.pair', {type}),
        create: type => this.command('game.create', {type}),
        join: room => this.command('game.join', {room}),
        leave: () => this.command('game.leave'),
        answer: (idx, answer) => this.command('game.answer', [idx, answer]),
    }


}