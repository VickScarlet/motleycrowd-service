import { WebSocketServer } from 'ws';
import { v4 as uuidGenerator } from 'uuid';
import { gzip } from 'zlib';
import IModule from "./imodule.js";

export default class Session extends IModule {
    #CONNECT = 0;
    #PING = 1;
    #PONG = 2;
    #MESSAGE = 3
    #REPLY = 4;
    #BORDERCAST = 9;

    #sessions = new Map();
    #onPone = new Map();

    get online() { return this.#sessions.size }

    async initialize() {
        const {host, port} = this.$configure;
        const wss = new WebSocketServer({host, port});
        wss.on('connection', session => this.#sessionConnection(session));
        console.debug('[Session|init] listen at %s:%d', host, port);
    }

    async #packet(data) {
        const serializeData = JSON.stringify(data);
        if(serializeData.length < 1024) return serializeData;
        return new Promise(
            (resolve, reject) => gzip(
                serializeData,
                (error, result)=> {
                    error? reject(error): resolve(result);
                }
            )
        );
    }

    async #sessionConnection(session) {
        const sid = uuidGenerator();
        this.#sessions.set(sid, session);
        const online = this.online;
        console.debug('[Session|conn] [online:%d] [sid:%s]', online, sid);
        session.on('close', () => this.#sessionClose(sid, session));
        session.on('message', message => this.#sessionMessage(sid, message, session));
        session.on('error', error => this.#sessionError(sid, error, session));
        const data = await this.$core.useraction('connected', sid);
        const packetMessage = await this.#packet([this.#CONNECT, data, [online, sid]]);
        session.send(packetMessage);
    }

    async #sessionClose(sid) {
        this.#sessions.delete(sid);
        console.debug('[Session|clsd] [online:%d] [sid:%s]', this.online, sid);
        this.$core.useraction('close', sid);
    }

    async #sessionError(sid, error) {
        console.error('[Session|err] [ssid:] error:', sid.substring(0,8), error);
        this.$core.useraction('error', sid, error);
    }

    async #sessionMessage(sid, message, session) {
        const [guid, receive] = JSON.parse(message.toString());
        switch(guid) {
            case this.#PING:
                // receive ping
                console.debug('[Session|ping] [ssid:%s]', sid.substring(0,8));
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

        console.debug('[Session|<<<<] [ssid:%s] receive:', sid.substring(0,8), receive);
        const data = await this.$core.useraction('message', sid, receive);
        console.debug('[Session|r>>>] [ssid:%s] message:', sid.substring(0,8), data);
        const packetMessage = await this.#packet([guid, data]);
        session.send(packetMessage);
    }

    async broadcast(message) {
        if(!this.#sessions.size) return;
        message = await this.#packet([this.#BORDERCAST, message]);
        this.#sessions.forEach(session => session.send(message));
    }

    async send(sid, message) {
        if(Array.isArray(sid)) return this.#lsend(sid, message);
        const session = this.#sessions.get(sid);
        if(!session) return;
        console.debug('[Session|s>>>] [ssid:%s] message:', sid.substring(0,8), message);
        message = await this.#packet([this.#MESSAGE, message]);
        session.send(message);
    }

    async #lsend(sids, message) {
        message = await this.#packet([this.#MESSAGE, message]);
        for(const sid of sids) {
            const session = this.#sessions.get(sid);
            if(!session) continue;
            session.send(message);
        }
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
        const data = await this.#packet([this.#PING]);
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.#onPone.delete(sid);
                console.debug('[Session|pong] [ssid:%s] timeout', sid.substring(0,8));
                reject(new Error('timeout'));
            }, 15000);
            const done = ()=>{
                clearTimeout(timeout);
                resolve(true);
            };
            this.#onPone.set(sid, done);
            session.send(data);
        });
    }
}
