import { WebSocketServer } from 'ws';
import { v4 as uuidGenerator } from 'uuid';
import { gzip } from 'zlib';

export default class Session {
    constructor({handle}) {
        this.#handle = handle;
    }

    #handle;
    #sessions = new Map();

    get online() { return this.#sessions.size }

    start({port}) {
        const wss = new WebSocketServer({port});
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

    #sessionConnection(session) {
        const uuid = uuidGenerator();
        this.#sessions.set(uuid, session);
        console.debug('[connected]', uuid);
        session.on('close', () => this.#sessionClose(uuid, session));
        session.on('message', message => this.#sessionMessage(uuid, message, session));
        session.on('error', error => this.#sessionError(uuid, error, session));
    }

    async #sessionClose(uuid) {
        console.debug('[closed]', uuid);
        this.#sessions.delete(uuid);
        this.#handle('close', uuid);
    }

    async #sessionError(uuid, error) {
        console.error('[error]', uuid.substring(0,8), error);
        this.#handle('error', uuid, error);
    }

    async #sessionMessage(uuid, message, session) {
        const [guid, receive] = JSON.parse(message.toString());
        console.debug('[message]', uuid.substring(0,8), receive);
        const data = await this.#handle('message', uuid, receive);
        const packetMessage = await this.#packet([2, guid, data]);
        session.send(packetMessage);
    }

    async broadcast(message) {
        if(!this.#sessions.size) return;
        this.#sessions.forEach(session => session.send(JSON.stringify([0, message])));
        message = await this.#packet([0, message]);
        this.#sessions.forEach(session => session.send(message));
    }

    async send(uuid, message) {
        const session = this.#sessions.get(uuid);
        if(!session) return;
        message = await this.#packet([1, message]);
        session.send(message);
    }

    ping(uuid) {
        const session = this.#sessions.get(uuid);
        if(session) session.ping();
    }

    __get(uuid) {
        return this.#sessions.get(uuid);
    }
}
