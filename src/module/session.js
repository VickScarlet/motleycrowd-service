import { WebSocketServer } from 'ws';
import { v4 as uuidGenerator } from 'uuid';
import { gzipSync } from 'zlib';
import IModule from "./imodule.js";

export default class Session extends IModule {
    #CONNECT = 0;
    #PING = 1;
    #PONG = 2;
    #MESSAGE = 3
    #REPLY = 4;
    #BORDERCAST = 9;

    #wss;
    #sessions = new Map();
    // #pipe = new Map();
    #onPone = new Map();

    get state() {
        return {
            online: this.online,
        }
    }
    get online() { return this.#sessions.size }

    async initialize() {
        const {host, port} = this.$configure;
        const wss = new WebSocketServer({host, port});
        this.#wss = wss;
        wss.on('connection', session => this.#sessionConnection(session));
        // logger.debug('[Session|init] listen at %s:%d', host, port);
    }

    async #packet(data) {
        const serializeData = JSON.stringify(data);
        if(serializeData.length < 1024) return serializeData;
        return gzipSync(serializeData);
    }

    async #sessionConnection(session) {
        const sid = uuidGenerator();
        this.#sessions.set(sid, session);
        // this.#pipe.set(session, []);
        const online = this.online;
        // logger.debug('[Session|conn] [online:%d] [sid:%s]', online, sid);
        session.on('close', () => this.#sessionClose(sid, session));
        session.on('message', message => this.#sessionMessage(sid, message, session));
        session.on('error', error => this.#sessionError(sid, error, session));
        const data = await this.$core.useraction('connected', sid);
        const packetMessage = await this.#packet([this.#CONNECT, data, [online, sid]]);
        session.send(packetMessage);
    }

    async #sessionClose(sid) {
        // this.#pipe.delete(this.#sessions.get(sid));
        this.#sessions.delete(sid);
        // logger.debug('[Session|clsd] [online:%d] [sid:%s]', this.online, sid);
        this.$core.useraction('close', sid);
    }

    async #sessionError(sid, error) {
        // logger.error('[Session|err] [ssid:] error:', sid.substring(0,8), error);
        this.$core.useraction('error', sid, error);
    }

    // async #pipeSend(session, data) {
    //     const pipe = this.#pipe.get(session);
    //     if(!pipe) return false;
    //     const send = (sdata, resolve) => session.send(sdata, err=>{
    //         resolve(!err);
    //         if(!this.#pipe.has(session)) return;
    //         pipe.shift();
    //         if(!pipe[0]) return;
    //         const d = pipe[0];
    //         pipe[0] = 0;
    //         send(d[0], d[1]);
    //     });
    //     return new Promise(resolve => {
    //         if(pipe.length != 0)
    //             return pipe.push([data, resolve]);
    //         pipe.push(0);
    //         send(data, resolve);
    //     });
    // }

    async #send(session, data) {
        return new Promise(resolve=>session.send(data,err=>resolve(!err)));
    }

    async #sessionMessage(sid, message, session) {
        const [guid, receive] = JSON.parse(message.toString());
        switch(guid) {
            case this.#PING:
                // receive ping
                // logger.debug('[Session|ping] [ssid:%s]', sid.substring(0,8));
                session.send(await this.#packet([this.#PONG, this.online]));
                return;
            case this.#PONG:
                // receive pong
                this.#onPone.get(sid)?.(receive);
                this.#onPone.delete(sid);
                return;
            case this.#REPLY:
            case this.#BORDERCAST:
            case this.#MESSAGE:
            default:
                break;
        }

        // logger.debug('[Session|<<<<] [ssid:%s] receive:', sid.substring(0,8), receive);
        const data = await this.$core.useraction('message', sid, receive);
        // logger.debug('[Session|r>>>] [ssid:%s] message:', sid.substring(0,8), data);
        const packetMessage = await this.#packet([guid, data, this.online]);
        await this.#send(session, packetMessage);
    }

    async broadcast(message) {
        if(!this.#sessions.size) return;
        message = await this.#packet([this.#BORDERCAST, message, this.online]);
        this.#sessions.forEach(session => session.send(message));
    }

    async send(sid, message) {
        const session = this.#sessions.get(sid);
        if(!session) return;
        // logger.debug('[Session|s>>>] [ssid:%s] message:', sid.substring(0,8), message);
        message = await this.#packet([this.#MESSAGE, message, this.online]);
        await this.#send(session, message);
    }

    async listSend(sids, message) {
        const sessions = sids
            .map(sid => this.#sessions.get(sid))
            .filter(session=>!!session);
        if(!sessions.length) return false;
        message = await this.#packet([this.#MESSAGE, message, this.online]);
        return Promise.all(
            sessions.map(session => this.#send(session, message))
        );
    }

    async close(sid, code, reason) {
        const session = this.#sessions.get(sid);
        if(!session) return;
        this.#sessions.delete(sid);
        session.close(code||3000, reason||"");
    }

    async ping(sid) {
        const session = this.#sessions.get(sid);
        if(!session) return false;
        const message = await this.#packet([this.#PING]);
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                this.#onPone.delete(sid);
                // logger.debug('[Session|pong] [ssid:%s] timeout', sid.substring(0,8));
                reject(new Error('timeout'));
            }, 15000);
            const done = ()=>{
                clearTimeout(timeout);
                resolve(true);
            };
            this.#onPone.set(sid, done);
            await this.#send(session, message);
        });
    }

    async shutdown() {
        if(!this.#wss) return;
        return new Promise((resolve, reject) => {
            this.#wss.close(err=>err? reject(err): resolve());
        });
    }
}
