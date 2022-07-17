import { WebSocketServer } from 'ws';
import { v4 as uuidGenerator } from 'uuid';
import { gzip } from 'zlib';

export default class Session {
    constructor({handle}) {
        this.#handle = handle;
    }

    #CONNECT = 0;
    #PING = 1;
    #PONG = 2;
    #MESSAGE = 3
    #REPLY = 4;
    #BORDERCAST = 9;

    #handle;
    #sessions = new Map();
    #onPone = new Map();

    get online() { return this.#sessions.size }

    start({port}) {
        const wss = new WebSocketServer({host: '0.0.0.0', port});
        wss.on('connection', session => this.#sessionConnection(session));
    }

    async #packet(data) {
        data = JSON.stringify(data);
        return data.length > 30 ? new Promise(
            (resolve, reject) => gzip(
                data,
                (error, result)=> {
                    error? reject(error): resolve(result);
                }
            )
        ) : data;
    }

    async #sessionConnection(session) {
        const uuid = uuidGenerator();
        this.#sessions.set(uuid, session);
        const online = this.online;
        console.debug('[Session|conn] [online:%d] [uuid:%s]', online, uuid);
        session.on('close', () => this.#sessionClose(uuid, session));
        session.on('message', message => this.#sessionMessage(uuid, message, session));
        session.on('error', error => this.#sessionError(uuid, error, session));
        const data = await this.#handle('connected', uuid);
        const packetMessage = await this.#packet([this.#CONNECT, data, online]);
        session.send(packetMessage);
    }

    async #sessionClose(uuid) {
        this.#sessions.delete(uuid);
        console.debug('[Session|clsd] [online:%d] [uuid:%s]', this.online, uuid);
        this.#handle('close', uuid);
    }

    async #sessionError(uuid, error) {
        console.error('[Session|err] [suuid:] error:', uuid.substring(0,8), error);
        this.#handle('error', uuid, error);
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
        const data = await this.#handle('message', uuid, receive);
        console.debug('[Session|r>>>] [suuid:%s] message:', uuid.substring(0,8), data);
        const packetMessage = await this.#packet([guid, data]);
        session.send(packetMessage);
    }

    async broadcast(message) {
        if(!this.#sessions.size) return;
        this.#sessions.forEach(session => session.send(JSON.stringify([0, message])));
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
