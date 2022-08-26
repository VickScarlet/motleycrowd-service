import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidGenerator } from 'uuid';
import { gzipSync } from 'zlib';
import IModule from "./imodule.js";

export default class Session extends IModule {
    #CONNECT = 0;
    #PING = 1;
    #PONG = 2;
    #MESSAGE = 3
    #REPLY = 4;
    #RESUME = 5;
    #BORDERCAST = 9;
    #wss;
    #sessions = new Map();
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
        wss.on('connection', session => this.#connection(session));
    }

    async #packet(data) {
        const serializeData = JSON.stringify(data);
        if(serializeData.length < 1024) return serializeData;
        return gzipSync(serializeData);
    }

    #connection(session) {
        let sid = uuidGenerator();
        const resume = lastSid=>{
            const lastSession = this.#sessions.get(lastSid);
            if(lastSession)
                lastSession.close(3001, "Resume session");
            this.#sessions.delete(sid);
            sid = lastSid;
            this.#sessions.set(sid, session);
            this.$emit('session.resume', sid);
            return true;
        }
        session.on('close', () => this.#sessionClose(sid, session));
        session.on('error', () => this.#sessionClose(sid, session));
        session.on('message', message => this.#sessionMessage(sid, message, session, resume));
        resume(sid);
    }

    async #sessionClose(sid, session) {
        if(!this.#sessions.has(sid)) return;
        this.#sessions.delete(sid);
        if(session.readyState === WebSocket.OPEN) {
            session.close(3001, "error close");
        }
        this.$emit('session.close', sid);
    }

    async #send(session, data) {
        return new Promise(resolve=>session.send(data,err=>resolve(!err)));
    }

    async #sessionMessage(sid, message, session, resume) {
        const [guid, ...receive] = JSON.parse(message.toString());
        let data;
        switch(guid) {
            case this.#RESUME:
                data = resume(...receive);
                data = [guid, data];
                break;
            case this.#PONG:
                // receive pong
                this.#onPone.get(sid)?.(...receive);
                this.#onPone.delete(sid);
                return;
            case this.#PING:
                // receive ping
                data = [this.#PONG];
                break;
            case this.#CONNECT:
                data = this.$core.baseinfo();
                data = [guid, data, sid];
                break;
            case this.#REPLY:
            case this.#BORDERCAST:
            case this.#MESSAGE:
            default:
                data = await this.$core.useraction(sid, {command: receive[0], data: receive[1]});
                data = [guid, data];
                break;
        }
        data.push(this.online);
        const packet = await this.#packet(data);
        await this.#send(session, packet);
    }

    async broadcast(message) {
        if(!this.#sessions.size) return;
        message = await this.#packet([this.#BORDERCAST, message, this.online]);
        this.#sessions.forEach(session => session.send(message));
    }

    async send(sid, message) {
        const session = this.#sessions.get(sid);
        if(!session) return;
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
        await session.close(code||3000, reason||"");
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
