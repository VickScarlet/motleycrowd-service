/**
 * @typedef {import('./session').sid} sid
 * @typedef {import('./user').uid} uid
 * @typedef {[code: number, data: any]} CommandResult
 * @typedef {(mark: sid|uid, data=)=>Promise<CommandResult>|CommandResult} CommandProxy
 * @typedef {Map<string, CommandProxy>} ProxyMap
 * @typedef {(data: any)=>void} EventCallback
 * @typedef {Set<EventCallback>} EventSet
 * @callback on
 * @param {string} event
 * @param {EventCallback} callback
 * @returns {void}
 * @callback off
 * @param {string} event
 * @param {EventCallback} callback
 * @returns {void}
 * @callback emit
 * @param {string} event
 * @param {any} data
 * @returns {void}
 *
 */
import ErrorCode from './errorcode.js';
import Database from './database/index.js';
import Question from './question/index.js';
import User from './user.js';
import Game from './game/index.js';
import Session from './session.js';
import process from 'process';

/** 核心模块 */
export default class Core {
    /**
     * @constructor
     * @param {object} conf
     * @param {import('./database/index').configure} conf.database
     * @param {import('./question/index').configure} conf.question
     * @param {import('./user').configure} conf.user
     * @param {import('./game/index').configure} conf.game
     * @param {import('./session').configure} conf.session
     * @returns {Core}
     */
    constructor({database, question, user, game, session}) {

        this.#database = new Database(this, database);
        this.#question = new Question(this, question);
        this.#user = new User(this, user);
        this.#game = new Game(this, game);
        this.#session = new Session(this, session);

        process.title = 'Metley Crowd Service';
        process.on('SIGINT', async ()=>{
            logger.info('[System] recived SIGINT');
            await this.shutdown();
            process.exit(0);
        });

        process.on('exit', ()=>{
            logger.info('[System]', 'bye.');
        });
    }

    /** @private @type {Map<string, EventSet>}*/
    #events = new Map();
    /** @private @type {Map<string, ProxyMap>}*/
    #proxy = new Map();
    /** @private @type {Set<string>} */
    #proxyR = new Set();
    /** @private 数据库 @type {Database} */
    #database;
    /** @private 题目 @type {Question} */
    #question;
    /** @private 用户 @type {User} */
    #user;
    /** @private 游戏 @type {Game} */
    #game;
    /** @private 会话 @type {Session} */
    #session;

    /** @readonly 错误码 */
    get $err() {return ErrorCode;}
    /** @readonly 数据库 */
    get database() { return this.#database; }
    /** @readonly 题目 */
    get question() { return this.#question; }
    /** @readonly 用户 */
    get user() { return this.#user; }
    /** @readonly 游戏 */
    get game() { return this.#game; }
    /** @readonly 会话 */
    get session() { return this.#session; }

    /**
     * 监听事件
     * @type {on}
     */
    on(event, callback) {
        if(!this.#events.has(event))
            this.#events.set(event, new Set());
        const callbacks = this.#events.get(event);
        callbacks.add(callback);
    }
    /**
     * 取消监听
     * @type {off}
     */
    off(event, callback) {
        if(!this.#events.has(event)) return;
        const callbacks = this.#events.get(event);
        callbacks.delete(callback);
    }
    /**
     * 发送事件
     * @type {emit}
     */
    emit(event, data) {
        if(!this.#events.has(event)) return;
        const callbacks = this.#events.get(event);
        callbacks.forEach(callback => {
            callback(data);
        });
    }

    /**
     * 设置代理
     * @private
     * @param {string} module
     * @param {[
     *      proxy: Object<string, CommandProxy>,
     *      requestSid?: boolean,
     * ]=} data
     * @returns {void}
     */
    #setProxy(module, data) {
        if(!data) return;
        const [proxy, requestSid] = data;
        /** @type {ProxyMap} */
        const map = new Map();
        for(const name in proxy)
            map.set(name, proxy[name]);
        this.#proxy.set(module, map);
        if(requestSid) this.#proxyR.add(module);
    }

    /**
     * 初始化
     * @async
     * @returns {Promise<void>}
     */
    async initialize() {
        logger.info('[System]', 'initializing...');
        const start = Date.now();
        await this.#database.initialize();
        await this.#question.initialize();
        await this.#user.initialize();
        await this.#game.initialize();
        await this.#session.initialize();
        this.#setProxy('user', this.#user.proxy());
        this.#setProxy('game', this.#game.proxy());
        logger.info('[System]', 'initializeed in', Date.now() - start, 'ms.');
    }

    /**
     * 关闭
     * @async
     * @returns {Promise<void>}
     */
    async shutdown() {
        logger.info('[System]', 'shutdowning...');
        await this.#session.shutdown();
        await this.#game.shutdown();
        await this.#user.shutdown();
        await this.#question.shutdown();
        await this.#database.shutdown();
        logger.info('[System]', 'shutdowned.');
        return true;
    }

    /**
     * 用户执行命令
     * @async
     * @param {sid} sid
     * @param {{command: string, data: any}} parameters
     * @returns {Promise<CommandResult>}
     */
    async useraction(sid, {command, data}) {
        if(!command) return [this.$err.NO_CMD];
        const [p, cmd] = command.split(".");
        const proxy = this.#proxy.get(p);
        if(!proxy || !proxy.has(cmd))
            return [this.$err.NO_CMD];
        let mark = sid;
        if(!this.#proxyR.has(p)) {
            if(!this.#user.isAuthenticated(sid)) return [this.$err.NO_AUTH];
            mark = this.#user.uid(sid);
        }
        return proxy.get(cmd)(mark, data);
    }

    /**
     * 发送消息给用户
     * @async
     * @param {uid} uid
     * @param {string} command
     * @param {any} data
     */
    async send(uid, command, data) {
        const sid = this.#user.sid(uid);
        if(!sid) return false;
        return this.#session.send(sid, [command, await data]);
    }

    /**
     * 组发送消息
     * @async
     * @param {uid[]} uids
     * @param {string} command
     * @param {any} data
     */
    async listSend(uids, command, data) {
        const sids = uids.map(uid => this.#user.sid(uid)).filter(sid=>!!sid);
        if(sids.length < 1) return false;
        return this.#session.listSend(sids, [command, await data]);
    }

    /** 基本信息 */
    baseinfo() {
        return {
            version: "0.0.1"
        };
    }

    /** @readonly 基本信息 */
    get state() {
        const { title, pid, platform } = process;
        return {
            title, pid, platform,
            memory: process.memoryUsage(),
            session: this.#session.state,
            game: this.#game.state,
        };
    }
}