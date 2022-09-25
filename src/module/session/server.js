/**
 * @typedef {string} sid
 * @typedef {{host: string, port: number}} configure
 */
import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidGenerator } from 'uuid';
import { gzipSync } from 'zlib';

const TICK = 30 * 60 * 1000;

/** 会话模块 */
export default class Server {
    /** @private WebSocketServer @type {WebSocketServer} */
    #wss;
    /** @private 会话索引 @type {Map<sid, Socket>} */
    #ss = new Map();
    #bannedip = new Map();
    #interval;
    get size() { return this.#ss.size;}
    /**
     * @override
     * @returns {Promise<void>}
     */
    constructor(host, port, handler) {
        this.#wss = new WebSocketServer({host, port})
            .on('connection', (ws, req) => {
                const ip = req.headers['x-forwarded-for'];
                if(this.#bannedip.has(ip)) {
                    ws.close(3003, "banned");
                    return;
                }
                const sid = uuidGenerator();
                const socket = new Socket(ws, req, {
                    close: _=>{
                        this.#ss.delete(sid);
                        handler.close?.(sid);
                    },
                    error: _=>{
                        if(ws.readyState === WebSocket.OPEN)
                            socket.close(3001, "error close");
                    },
                    message: m=>handler.message?.(sid, m),
                });
                this.#ss.set(sid, socket);
            });
        this.#interval = setInterval(_=>{
            const now = Date.now();
            this.#bannedip.forEach((v, k)=>{
                if(v < now) this.#bannedip.delete(k);
            });
        }, TICK);
    }

    close(sid, code, reason) {
        clearInterval(this.#interval);
        const socket = this.#ss.get(sid);
        if(!socket) return;
        this.#ss.delete(sid);
        socket.close(code, reason);
    }

    async send(sid, data) {
        const socket = this.#ss.get(sid);
        if(!socket) return false;
        return socket.send(data);
    }

    async sclose() {
        if(!this.#wss) return;
        return new Promise((resolve, reject) => {
            this.#wss.removeAllListeners();
            this.#ss.forEach(s=>s.close(3000, "shutdown"));
            this.#wss.close(err=>{
                if(err) return reject(err);
                this.#wss = null;
                resolve();
            });
        });
    }

    banip(sid) {
        const socket = this.#ss.get(sid);
        if(!socket) return;
        const banned = socket.ip;
        this.#bannedip.set(banned, Date.now() + TICK);
        this.#ss.forEach((s, i) => {
            if(s.ip === banned) {
                s.close(3002);
                this.#ss.delete(i);
            }
        });
    }
}

class Socket {
    /**
     * @param {WebSocket} ws
     * @param {import('http').IncomingMessage} req
     * @param {{
     *      close?: Function,
     *      error?: Function,
     *      message?: Function,
     * }} handler
     */
    constructor(ws, req, handler) {
        this.#ws = ws;
        this.#req = req;
        ws.on('close', _=>handler.close?.());
        ws.on('error', _=>handler.error?.());
        ws.on('message', m=>{
            if(handler.message)
                handler.message(
                    JSON.parse(m.toString())
                );
        });
    }
    #ws;
    #req;

    get ip() {
        return this.#req.headers['x-forwarded-for'];
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
     * 发送消息
     * @param {any} data
     * @returns {Promise<boolean>}
     */
    async send(data) {
        const packetData = await this.#packet(data);
        return new Promise(resolve=>
            this.#ws.send(packetData, err=>resolve(!err))
        );
    }

    /**
     * 关闭连接
     * @param {sid} sids
     * @param {number|undefined} code
     * @param {string|undefined} reason
     * @returns {Promise<void>}
     */
    close(code=3000, reason='') {
        this.#ws.close(code, reason);
    }
}