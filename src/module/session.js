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
        const uuid = uuidGenerator();
        this.#sessions.set(uuid, session);
        const online = this.online;
        console.debug('[Session|conn] [online:%d] [uuid:%s]', online, uuid);
        session.on('close', () => this.#sessionClose(uuid, session));
        session.on('message', message => this.#sessionMessage(uuid, message, session));
        session.on('error', error => this.#sessionError(uuid, error, session));
        const data = await this.$core.useraction('connected', uuid);
        const packetMessage = await this.#packet([this.#CONNECT, data, [online, uuid]]);
        session.send(packetMessage);
    }

    async #sessionClose(uuid) {
        this.#sessions.delete(uuid);
        console.debug('[Session|clsd] [online:%d] [uuid:%s]', this.online, uuid);
        this.$core.useraction('close', uuid);
    }

    async #sessionError(uuid, error) {
        console.error('[Session|err] [suuid:] error:', uuid.substring(0,8), error);
        this.$core.useraction('error', uuid, error);
    }

    async #sessionMessage(uuid, message, session) {
        const [guid, receive] = JSON.parse(message.toString());
        switch(guid) {
            case this.#PING:
                // receive ping
                console.debug('[Session|ping] [suuid:%s]', uuid.substring(0,8));
                session.send(await this.#packet([this.#PONG, this.online]));
                return;
            case this.#PONG:
                // receive pong
                this.#onPone.get(uuid)?.(receive);
                this.#onPone.delete(uuid);
                return;
            case this.#REPLY:
            case this.#BORDERCAST:
            case this.#MESSAGE:
            default:
                break;
        }

        console.debug('[Session|<<<<] [suuid:%s] receive:', uuid.substring(0,8), receive);
        const data = await this.$core.useraction('message', uuid, receive);
        console.debug('[Session|r>>>] [suuid:%s] message:', uuid.substring(0,8), data);
        const packetMessage = await this.#packet([guid, data]);
        session.send(packetMessage);
    }

    async broadcast(message) {
        if(!this.#sessions.size) return;
        message = await this.#packet([this.#BORDERCAST, message]);
        this.#sessions.forEach(session => session.send(message));
    }

    async send(uuid, message) {
        if(Array.isArray(uuid)) return this.#lsend(uuid, message);
        const session = this.#sessions.get(uuid);
        if(!session) return;
        console.debug('[Session|s>>>] [suuid:%s] message:', uuid.substring(0,8), message);
        message = await this.#packet([this.#MESSAGE, message]);
        session.send(message);
    }

    async #lsend(uuids, message) {
        message = await this.#packet([this.#MESSAGE, message]);
        for(const uuid of uuids) {
            const session = this.#sessions.get(uuid);
            if(!session) continue;
            session.send(message);
        }
    }

    async close(uuid, code, reason) {
        const session = this.#sessions.get(uuid);
        if(!session) return;
        this.#sessions.delete(uuid);
        session.close(code||0, reason||"");

    }

    async ping(uuid) {
        const session = this.#sessions.get(uuid);
        if(!session) return false;
        const data = await this.#packet([this.#PING]);
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.#onPone.delete(uuid);
                console.debug('[Session|pong] [suuid:%s] timeout', uuid.substring(0,8));
                reject(new Error('timeout'));
            }, 15000);
            const done = ()=>{
                clearTimeout(timeout);
                resolve(true);
            };
            this.#onPone.set(uuid, done);
            session.send(data);
        });
    }
}
