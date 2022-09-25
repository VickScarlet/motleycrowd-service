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
    #PING = 0;
    #PONG = 1;
    #MESSAGE = 2;
    #BORDERCAST = 3;
    #CONNECT = 4;
    #RESUME = 5;
    #AUTH = 8;
    #LOGOUT = 9;

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
    #uid;

    get #needping() {
        return Date.now() - this.#lastping > 60000;
    }
    get online() { return this.#online; }
    get delay() { return this.#delay; }

    async start() {
        return this.#connect();
    }

    get #url() {
        if(this.#port) return `${this.#protocol}://${this.#host}:${this.#port}`;
        return `${this.#protocol}://${this.#host}`;
    }

    async #ws(first) {
        return new Promise((resolve, reject) => {
            let message, close;
            const ws = new WebSocket(this.#url);
            ws.addEventListener('open', _ => {
                message = async data => {
                    message = this.#onmessage.bind(this);
                    close = ({code, reason}) => this.#onclose(code, reason);
                    this.#client = ws;
                    resolve({ws, data});
                };
                ws.send(JSON.stringify(first));
            });
            ws.addEventListener('error', e => reject(e));
            ws.addEventListener('message', async ({data}) => {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    data = JSON.parse(unzipSync(data).toString());
                }
                this.#online = data.pop();
                message(data);
            });
            ws.addEventListener('close', e => close?.(e));
        });
    }

    async #connect() {
        return this.#ws([this.#CONNECT])
            .then(({data: [, info, sid]}) => {
                this.#sid = sid;
                this.#onconnect(info);
                return true;
            });
    }

    async #resume() {
        if(!this.#sid) return this.#connect();
        return this.#ws([this.#RESUME, this.#sid, this.#uid])
            .then(({data: [, success, sid]})=>{
                this.#sid = sid;
                return [true, success];
            })
            .catch(_=>([false]));
    }

    async #onmessage([guid, content, sync]) {
        const callback = index=>{
            if(!this.#callbacks.has(index)) return;
            this.#callbacks.get(index)(null, content);
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
                this.#callbacks.get(guid)(content);
                break;
            default:
                callback(guid);
                break;
        }
    }

    #onclose(code, reason) {
        this.#client = null;
        switch(code) {
            case 3000:
            case 3001:
                return;
        }
        const exclude = new Set([
            this.#MESSAGE,
            this.#BORDERCAST,
        ]);
        const error = new Error(`Network Error`);
        this.#callbacks.forEach((callback, guid) => {
            if(exclude.has(guid)) return;
            this.#callbacks.delete(guid);
            callback(error);
        });
        const circleResume = ()=>this.#resume()
            .then(([success, isAuth])=>{
                if(success) return;
                circleResume();
            });
        circleResume();
    }

    async #send(id, ...others) {
        if(!this.#client) throw new Error('Network Error');
        switch(id) {
            case this.#PONG:
                this.#client.send(JSON.stringify([id, ...others]));
                return true;
            case this.#PING:
                break;
            default:
                if(this.#callbacks.has(id)) {
                    throw new Error('Duplicate id');
                }
        }
        return new Promise((resolve, reject) => {
            this.#callbacks.set(id, (err, result)=>{
                if(err) return reject(err);
                resolve(result);
            });
            this.#client.send(JSON.stringify([id, ...others]));
        });
    }

    async #ping() {
        console.debug('[Session|ping] ping...');
        const start = Date.now();
        await this.#send(this.#PING);
        const delay = Date.now() - start;
        this.#delay = delay;
        const online = this.#online;
        console.debug('[Session|ping] [delay:%dms] [online:%d]', delay, online);
        return {delay, online};
    }

    #genMessageId() {
        const guidF = uuidGenerator();
        const L = guidF.length;
        for(let i = 1; i<=L; i++) {
            const guid = guidF.substring(0, i)
            if(this.#callbacks.has(guid)) continue;
            return guid;
        }
    }

    /**
     *
     * @param {string} command
     * @param {any} data
     * @return {Promise<{
     *      success: boolean,
     *      code: number,
     *      data?: any,
     * }>}
     */
    async command(command, data) {
        console.debug('[Session|>>>>] [command:%s] data:', command, data);
        return this.#command(this.#genMessageId(), command, data);
    }

    async #command(...args) {
        try {
            const [code, ret] = await this.#send(...args);
            if(code) {
                console.debug('Command error:', code);
                $.emit('command.error', code);
            }
            return {
                success: code !== undefined && !code,
                code, data: ret,
            };
        } catch (err) {
            console.error(err);
            $.emit('command.error', -1);
            return { success: false, code: -1 };
        }
    }

    async ping() {
        if(this.#client && this.#needping) {
            this.#lastping = Date.now();
            return this.#ping();
        }
        const {delay, online} = this;
        return {delay, online};
    }

    #AUTH_REGISTER = 0;
    #AUTH_LOGIN = 1;
    #AUTH_GUEST = 2;
    async authenticate(username, password) {
        const gsync = await this.$db.gsync(username);
        return this.#command(
            this.#AUTH,
            this.#AUTH_LOGIN,
            username,
            password,
            gsync,
        ).then(({data})=>this.#uid=data||null);
    }

    async register(username, password) {
        return this.#command(
            this.#AUTH,
            this.#AUTH_REGISTER,
            username,
            password,
        ).then(({data})=>this.#uid=data||null);
    }

    async guest() {
        return this.#command(
            this.#AUTH,
            this.#AUTH_GUEST,
        ).then(({data})=>this.#uid=data||null);
    }

    async logout() {
        return this.#command(
            this.#LOGOUT
        ).then(({success})=>{
            this.#uid = null;
            return success;
        });
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
        authenticate: (username, password) => this.#session.authenticate(username, password),
        register: (username, password) => this.#session.register(username, password),
        logout: () => this.#session.logout(),
        guest: () => this.#session.guest(),
    }

    game = {
        pair: type => this.command('game.pair', {type}),
        create: type => this.command('game.create', {type}),
        join: room => this.command('game.join', {room}),
        leave: () => this.command('game.leave'),
        answer: (idx, answer) => this.command('game.answer', [idx, answer]),
    }


}