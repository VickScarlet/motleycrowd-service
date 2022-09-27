/**
 * @typedef {import('./user').uid} uid
 * @typedef {[code: number, data: any]} CommandResult
 * @typedef {(uid:uid, data=)=>Promise<CommandResult>|CommandResult} CommandProxy
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
import {clone} from '../functions/index.js';
import ErrorCode from './errorcode.js';
import Sheet from './sheet/index.js';
import Database from './database/index.js';
import Question from './question/index.js';
import User from './user/index.js';
import Game from './game/index.js';
import Rank from './rank/index.js';
import Asset from './asset/index.js';
import Session from './session/index.js';
import Achievement from './achievement/index.js';
import process from 'process';

/** 核心模块 */
export default class Core {
    /**
     * @constructor
     * @param {object} conf
     * @param {import('./database').configure} conf.database
     * @param {import('./question').configure} conf.question
     * @param {import('./user').configure} conf.user
     * @param {import('./game').configure} conf.game
     * @param {import('./rank').configure} conf.rank
     * @param {import('./session').configure} conf.session
     * @returns {Core}
     */
    constructor({name, version}, {
        sheet, database, question, user, game,
        rank, asset, achievement, session
    }) {
        $l.system.info(`${name}@${version}`);
        this.#version = version;
        this.#sheet = new Sheet(this, sheet);
        this.#database = new Database(this, database);
        this.#question = new Question(this, question);
        this.#user = new User(this, user);
        this.#game = new Game(this, game);
        this.#rank = new Rank(this, rank);
        this.#asset = new Asset(this, asset);
        this.#achievement = new Achievement(this, achievement);
        this.#session = new Session(this, session);

        process.on('SIGINT', async ()=>{
            $l.system.info('recived SIGINT');
            await this.shutdown();
            process.exit(0);
        });

        process.on('exit', ()=>{
            $l.system.info('bye.');
        });

        process.on('uncaughtException', err => {
            $l.system.error(err);
            process.exit(1);
        });
    }

    #version;
    /** @private @type {Map<string, EventSet>}*/
    #events = new Map();
    /** @private @type {Map<string, ProxyMap>}*/
    #proxy = new Map();
    /** @private 表 @type {Sheet} */
    #sheet;
    /** @private 数据库 @type {Database} */
    #database;
    /** @private 题目 @type {Question} */
    #question;
    /** @private 用户 @type {User} */
    #user;
    /** @private 游戏 @type {Game} */
    #game;
    /** @private 排行榜 @type {Rank} */
    #rank;
    /** @private 资产 @type {Asset} */
    #asset;
    /** @private 成就 @type {Achievement} */
    #achievement;
    /** @private 会话 @type {Session} */
    #session;

    /** @readonly */
    get $err() {return ErrorCode;}
    /** @readonly */
    get sheet() { return this.#sheet; }
    /** @readonly */
    get database() { return this.#database; }
    /** @readonly */
    get question() { return this.#question; }
    /** @readonly */
    get user() { return this.#user; }
    /** @readonly */
    get game() { return this.#game; }
    /** @readonly */
    get rank() { return this.#rank; }
    /** @readonly */
    get asset() { return this.#asset; }
    /** @readonly */
    get achievement() { return this.#achievement; }
    /** @readonly */
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
     * @param {{[proxy: string]: CommandProxy}} proxy
     * @returns {void}
     */
    #setProxy(module, proxy) {
        if(!proxy) return;
        /** @type {ProxyMap} */
        const map = new Map();
        for(const name in proxy)
            map.set(name, proxy[name]);
        this.#proxy.set(module, map);
    }

    /**
     * 初始化
     * @async
     * @returns {Promise<void>}
     */
    async initialize() {
        $l.system.info('initializing...');
        const start = Date.now();
        await this.#sheet.initialize();
        await this.#database.initialize();
        await this.#question.initialize();
        await this.#user.initialize();
        await this.#game.initialize();
        await this.#rank.initialize();
        await this.#asset.initialize();
        await this.#session.initialize();
        this.#setProxy('user', this.#user.proxy());
        this.#setProxy('game', this.#game.proxy());
        this.#setProxy('rank', this.#rank.proxy());
        this.#setProxy('achv', this.#achievement.proxy());
        $l.system.info('initializeed in', Date.now() - start, 'ms.');
    }

    /**
     * 关闭
     * @async
     * @returns {Promise<void>}
     */
    async shutdown() {
        $l.system.info('shutdowning...');
        await this.#session.shutdown();
        await this.#achievement.shutdown();
        await this.#asset.shutdown();
        await this.#rank.shutdown();
        await this.#game.shutdown();
        await this.#user.shutdown();
        await this.#question.shutdown();
        await this.#database.shutdown();
        await this.#sheet.shutdown();
        $l.system.info('shutdowned.');
        return true;
    }

    /**
     * 用户执行命令
     * @async
     * @param {uid} uid
     * @param {{command: string, data: any}} parameters
     * @returns {Promise<CommandResult>}
     */
    async useraction(uid, {command, data}) {
        if(!command) return [this.$err.NO_CMD];
        const [p, cmd] = command.split(".");
        const proxy = this.#proxy.get(p);
        if(!proxy || !proxy.has(cmd))
            return [this.$err.NO_CMD];
        return proxy.get(cmd)(uid, data);
    }

    /**
     * 发送消息给用户
     * @async
     * @param {uid} uid
     * @param {string} command
     * @param {any} data
     */
    async send(uid, command, data) {
        return this.#session.send(uid, [command, await data]);
    }

    /**
     * 组发送消息
     * @async
     * @param {uid[]} uids
     * @param {string} command
     * @param {any} data
     */
    async listSend(uids, command, data) {
        return this.#session.listSend(uids, [command, await data]);
    }

    #i;
    /** 基本信息 */
    baseinfo() {
        if(this.#i) return this.#i;
        const info = { version: this.#version };

        info.session = this.#session.$i;
        info.achievement = this.#achievement.$i;
        info.asset = this.#asset.$i;
        info.rank = this.#rank.$i;
        info.game = this.#game.$i;
        info.user = this.#user.$i;
        info.question = this.#question.$i;
        info.database = this.#database.$i;
        info.sheet = this.#sheet.$i;

        this.#i = clone(info);
        return info;
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