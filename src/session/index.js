import { WebSocketServer } from 'ws';
import { v4 as uuidGenerator } from 'uuid';

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
        session.send(JSON.stringify([2, guid, data]));
    }

    broadcast(message) {
        this.#sessions.forEach(session => session.send(JSON.stringify([0, message])));
    }

    send(uuid, message) {
        const session = this.#sessions.get(uuid);
        if(session) session.send(JSON.stringify([1, message]));
    }

    ping(uuid) {
        const session = this.#sessions.get(uuid);
        if(session) session.ping();
    }

    __get(uuid) {
        return this.#sessions.get(uuid);
    }
}
