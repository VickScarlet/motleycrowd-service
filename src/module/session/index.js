/**
 * @typedef {string} sid
 * @typedef {{host: string, port: number}} configure
 */
import Server from './server.js';
import IModule from "../imodule.js";
import { CronJob } from "cron";

/** 会话模块 */
export default class Session extends IModule {
    /** @private ping @readonly */
    #PING = 0;
    /** @private pong @readonly */
    #PONG = 1;
    /** @private 消息 @readonly */
    #MESSAGE = 2;
    /** @private 广播 @readonly */
    #BORDERCAST = 3;
    /** @private 连接 @readonly */
    #CONNECT = 4;
    /** @private 恢复 @readonly */
    #RESUME = 5;
    /** @private 回复 @readonly */
    #AUTH = 8;
    #LOGOUT = 9;

    #server;
    #uid = new Map();
    #sid = new Map();
    #pending = new Map();
    #job;

    /** @readonly 状态 @type {number} */
    get state() { return { online: this.online } }
    /** @readonly 在线人数 @type {number} */
    get online() { return this.#server.size; }

    /**
     * @override
     * @returns {Promise<void>}
     */
    async initialize() {
        const start = Date.now();
        this.$info('initializing...');
        /** @type {configure} */
        const {host, port, cron, hold} = this.$configure;
        const server = new Server(host, port, {
            close: s => this.#close(s, hold),
            message: (s, m) => this.#dispatch(s, m),
        });
        this.#server = server;
        this.#job = new CronJob(cron, () => this.#cronJob());
        this.#job.start();
        this.$info('initialized in', Date.now()-start, 'ms.');
    }

    /**
     * @override
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.$info('shutdowning...');
        this.#job.stop();
        if(this.#server)
            await this.#server.sclose();
        this.$info('shutdowned.');
    }

    #cronJob() {
        const now = Date.now();
        for(const [uid, time] of this.#pending) {
            if(now < time) continue;
            this.close(uid, 3001, 'ACron');
            $emit('session.leave', uid);
        }
    }

    #close(sid, hold) {
        const uid = this.#uid.get(sid);
        if(!uid) return;
        $emit('session.pending', uid);
        this.#pending.set(uid, Date.now() + hold);
    }

    async #dispatch(sid, [guid, ...receive]) {
        let fn;
        switch(guid) {
            case this.#CONNECT:
                fn = this.#connect; break;
            case this.#RESUME:
                fn = this.#resume; break;
            case this.#PING:
                fn = this.#ping; break;
            case this.#PONG:
                fn = this.#pong; break;
            case this.#AUTH:
                fn = this.#auth; break;
            case this.#LOGOUT:
                fn = this.#logout; break;
            default:
                fn = this.#action; break;
        }
        try {
            const result = await fn.call(this, sid, guid, ...receive);
            if(result)
                await this.#send(sid, result);
        } catch (reason) {
            this.$error(
                this.#uid.get(sid),
                guid, receive, reason
            )
        }
    }

    #connect(sid, guid) {
        return [guid, this.$core.baseinfo(), sid];
    }

    #resume(sid, guid, csid, cuid) {
        const suid = this.#uid.get(csid);
        if(cuid != suid) return [guid, false, sid];
        $emit('session.resume', suid);
        return [guid, true, sid];
    }

    #ping(sid) { return [this.#PONG]; }

    #pong(sid) {}

    #AUTH_REGISTER = 0;
    #AUTH_LOGIN = 1;
    #AUTH_GUEST = 2;
    #limit = new Set();

    async #auth(sid, guid, type, username, password, sync={}) {
        this.#logout(sid);
        // AUTH LIMIT
        if(this.#limit.has(sid))
            return [guid, [this.$err.AUTH_LIMIT]];
        this.#limit.add(sid);
        setTimeout(() => this.#limit.delete(sid), 5000);
        // AUTH LIMIT
        let result;
        let gsync = false;
        let emit;
        username = $norml.string(username, '');
        password = $norml.string(password, '');
        switch(type) {
            case this.#AUTH_REGISTER:
                result = await this.$user.register(username, password);
                emit = 'session.register';
                break;
            case this.#AUTH_LOGIN:
                result = await this.$user.authenticate(username, password);
                emit = 'session.authenticate';
                gsync = true;
                break;
            case this.#AUTH_GUEST:
                result = this.$user.guest();
                emit = 'session.guest';
                break;
            default:
                return [guid, [this.$err.PARAM_ERROR]];
        }
        const [code, uid] = result;
        if(code == -1) {
            this.#server.banip(sid);
            return;
        }
        if(!code) {
            this.close(uid, 3001, 'AAuth');
            this.#uid.set(sid, uid);
            this.#sid.set(uid, sid);
            $emit(emit, uid);
            if(gsync) {
                if(!sync || sync.uid !== uid) sync = null;
                else sync = sync.sync;
                await this.$db.gsync(uid, sync);
            }
        }
        return [guid, result];
    }

    #logout(sid, guid) {
        const uid = this.#uid.get(sid);
        if(!uid) return [guid, [0]];
        this.#uid.delete(sid);
        this.#sid.delete(uid);
        const result = this.$user.logout(uid);
        return [guid, result];
    }

    async #action(sid, guid, command, data) {
        const uid = this.#uid.get(sid);
        if(!uid) return [guid, [this.$err.NO_AUTH]];
        const result = await this.$core.useraction(uid, {command, data});
        return [guid, result];
    }

    async #send(sid, datas) {
        const uid = this.#uid.get(sid);
        const attach = this.$core.getAttach(uid);
        if(attach) datas.push(attach);
        datas.push(this.online);
        await this.#server.send(sid, datas);
    }

    /**
     * 广播消息
     * @param {any} message
     * @returns {Promise<void>}
     */
     async broadcast(message) {
        const data = [this.#BORDERCAST, message];
        return this.#server.boardcast(data);
    }

    /**
     * 发送消息
     * @param {string} uid
     * @param {any} message
     * @returns {Promise<boolean>}
     */
     async send(uid, message) {
        const sid = this.#sid.get(uid);
        if(!sid) return false;
        return this.#send(sid, [
            this.#MESSAGE, message
        ]);
    }

    /**
     * 组发送消息
     * @param {string[]} uids
     * @param {any} message
     * @returns {Promise<boolean[]>}
     */
    async listSend(uids, message) {
        return Promise.all(
            uids.map(
                uid=>this.send(uid, message)
            )
        );
    }

    /**
     * 关闭连接
     * @param {string} uid
     * @param {number|undefined} code
     * @param {string|undefined} reason
     */
    close(uid, code, reason) {
        const sid = this.#sid.get(uid);
        if(!sid) return;
        this.#pending.delete(uid);
        this.#server.close(sid, code||3000, reason||"");
    }
}