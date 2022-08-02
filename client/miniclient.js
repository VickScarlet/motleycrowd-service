import '../src/global.function.js';
import WebSocket from 'ws';
import { v4 as uuidGenerator } from 'uuid';
import {unzipSync} from 'zlib';
import Question from '../src/module/question/index.js';

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
    #BORDERCAST = 9;

    #protocol;
    #host;
    #port;
    #ws = null;
    #callbacks = new Map();
    #online = NaN;
    #delay = NaN;
    #lastping = 0;
    #onconnect;
    #suid;

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

    async #connect() {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const done = async (data, [online, suid])=>{
                this.#delay = Date.now() - start;
                this.#online = online;
                this.#suid = suid;
                await this.#onconnect(data, online);
                resolve();
            }
            this.#callbacks.set(this.#CONNECT, done);
            this.#ws = new WebSocket(this.#url);
            this.#ws.on('message', data => this.#onmessage(data));
            this.#ws.on('close', ({code, reason}) => this.#onclose(code, reason));
            this.#ws.on('error', e => reject(e));
        });
    }

    async #onmessage(message) {
        try {
            message = JSON.parse(message.toString());
        } catch (e) {
            message = JSON.parse(unzipSync(message).toString());
        }
        const [guid, content, attach] = message;
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
            case this.#CONNECT:
            case this.#REPLY:
            default:
                callback(guid);
                break;
        }
    }

    #onclose(code, reason) {
        this.#ws = null;
    }

    #send(data) {
        this.#ws.send(JSON.stringify(data));
    }

    close() {
        this.#ws.close();
    }

    #ping() {
        return new Promise((resolve, reject) => {
            if(!this.#ws) return reject('not connected');
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
                this.#callbacks.set(guid, ret=>resolve(ret));
                this.#send([guid, {c: command, d: data}]);
                return;
            }
        });
    }

    async ping() {
        if(this.#ws && this.#needping) {
            this.#lastping = Date.now();
            return this.#ping();
        }
        const {delay, online} = this;
        return {delay, online};
    }
}

export default class MiniClient {
    constructor({session}) {
        this.#question = new Question();
        this.#session = new Session(session, {
            boardcast: data => this.onboardcast?.(data),
            connect: ({version}, online) => this.onconnect?.(version, online),
            message: data => this.onmessage?.(data),
        });
    }
    #session;
    #question;

    async initialize() {
        await this.#question.initialize();
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

    async onmessage({c,d}) {
        switch(c) {
            case 'game.question':
                // auto answer
                const question = this.#question.info(d);
                const answer = listRandom(Object.keys(question.options));
                await this.delay(1000, 10000);
                await this.game.answer(answer, d);
                return;
            case 'game.settlement':
                await this.delay(15000, 60000);
                await this.game.pair(Math.random() > 0.9?10:100);
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
        answer: (answer, question) => this.command('game.answer', {answer, question}),
    }


}