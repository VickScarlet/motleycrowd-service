/**
 * @typedef {string} sid
 * @typedef {{host: string, port: number}} configure
 */
import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidGenerator } from 'uuid';
import { gzipSync } from 'zlib';
import IModule from "./imodule.js";

/** 会话模块 */
export default class Session extends IModule {
    /** @private 连接 @readonly */
    #CONNECT = 0;
    /** @private ping @readonly */
    #PING = 1;
    /** @private pong @readonly */
    #PONG = 2;
    /** @private 消息 @readonly */
    #MESSAGE = 3
    /** @private 回复 @readonly */
    #REPLY = 4;
    /** @private 恢复 @readonly */
    #RESUME = 5;
    /** @private 广播 @readonly */
    #BORDERCAST = 9;


    /** @private WebSocketServer @type {WebSocketServer} */
    #wss;
    /** @private 会话索引 @type {Map<sid, WebSocket>} */
    #sessions = new Map();
    #onPone = new Map();

    /** @readonly 状态 @type {number} */
    get state() {
        return {
            online: this.online,
        }
    }
    /** @readonly 在线人数 @type {number} */
    get online() { return this.#sessions.size }

    /**
     * @override
     * @returns {Promise<void>}
     */
    async initialize() {
        /** @type {configure} */
        const {host, port} = this.$configure;
        const wss = new WebSocketServer({host, port});
        this.#wss = wss;
        wss.on('connection', session => this.#connection(session));
    }

    /**
     * 打包数据
     * @param {any} data
     * @returns {Promise<string|Buffer>}
     */
    async #packet(data) {
        const serializeData = JSON.stringify(data);
        if(serializeData.length < 1024) return serializeData;
        return gzipSync(serializeData);
    }

    /**
     * 客户端连接
     * @private
     * @param {WebSocket} session
     * @returns {void}
     */
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

    /**
     * 客户端关闭
     * @private
     * @param {sid} sid
     * @param {WebSocket} session
     * @returns {void}
     */
    async #sessionClose(sid, session) {
        if(!this.#sessions.has(sid)) return;
        this.#sessions.delete(sid);
        if(session.readyState === WebSocket.OPEN) {
            session.close(3001, "error close");
        }
        this.$emit('session.close', sid);
    }

    /**
     * 发送消息
     * @private
     * @param {WebSocket} session
     * @param {any} data
     * @returns {Promise<boolean>}
     */
    async #send(session, data) {
        return new Promise(resolve=>session.send(data,err=>resolve(!err)));
    }

    /**
     * 客户端消息
     * @private
     * @param {sid} sid
     * @param {any} message
     * @param {WebSocket} session
     * @param {function} resume
     * @returns {Promise<void>}
     */
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
        const sync = this.$core.sync(sid);
        if(sync) data.push(sync);
        data.push(this.online);
        const packet = await this.#packet(data);
        await this.#send(session, packet);
    }

    /**
     * 广播消息
     * @param {any} message
     * @returns {Promise<void>}
     */
    async broadcast(message) {
        if(!this.#sessions.size) return;
        message = await this.#packet([this.#BORDERCAST, message, this.online]);
        this.#sessions.forEach(session => session.send(message));
    }

    /**
     * 发送消息
     * @param {sid} sid
     * @param {any} message
     * @returns {Promise<boolean>}
     */
    async send(sid, message) {
        const session = this.#sessions.get(sid);
        if(!session) return;
        const data = [this.#MESSAGE, message];
        const sync = this.$core.sync(sid);
        if(sync) data.push(sync);
        data.push(this.online);
        message = await this.#packet(data);
        await this.#send(session, message);
    }

    /**
     * 组发送消息
     * @param {sid[]} sids
     * @param {any} message
     * @returns {Promise<boolean[]>}
     */
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


    /**
     * 关闭连接
     * @param {sid} sids
     * @param {number|undefined} code
     * @param {string|undefined} reason
     * @returns {Promise<void>}
     */
    close(sid, code, reason) {
        const session = this.#sessions.get(sid);
        if(!session) return;
        session.close(code||3000, reason||"");
    }

    /**
     * ping
     * @param {sid} sids
     * @returns {Promise<boolean>}
     */
    async ping(sid) {
        const session = this.#sessions.get(sid);
        if(!session) return false;
        const message = await this.#packet([this.#PING]);
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                this.#onPone.delete(sid);
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

    /**
     * @override
     * @returns {Promise<void>}
     */
    async shutdown() {
        if(!this.#wss) return;
        return new Promise((resolve, reject) => {
            this.#wss.removeAllListeners();
            this.#sessions.forEach(session => session.close(3000, "shutdown"));
            this.#wss.close(err=>err? reject(err): resolve());
        });
    }
}
