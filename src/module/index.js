import Logger from '../logger.js';
import ErrorCode from './errorcode.js';
import Database from './database/index.js';
import Question from './question/index.js';
import User from './user.js';
import Game from './game/index.js';
import Session from './session.js';
import process from 'process';

/**
 * 核心模块
 * @class Core
 * @constructor [{database, user, game, session}]
 */
export default class Core {
    constructor({database, question, user, game, session}) {

        this.#database = new Database(this, database);
        this.#question = new Question(this, question);
        this.#user = new User(this, user);
        this.#game = new Game(this, game);
        this.#session = new Session(this, session);

        process.title = 'Metley Crowd Service';
        // process.on('uncaughtException', err => {
        //     console.error(err);
        // });
        process.on('SIGINT', async ()=>{
            logger.info('[System] recived SIGINT');
            await this.shutdown();
            process.exit(0);
        });

        process.on('exit', ()=>{
            logger.info('[System]', 'bye.');
        });
    }

    #proxy = new Map();
    #proxyR = new Set();
    #database;
    #question;
    #user;
    #game;
    #session;

    get $err() {return ErrorCode;}
    get database() { return this.#database; }
    get question() { return this.#question; }
    get user() { return this.#user; }
    get game() { return this.#game; }
    get session() { return this.#session; }

    proxy(proxy, cmds, requestSid) {
        if(this.#proxy.has(proxy)) {
            logger.info('[System] proxy <%s> %s', proxy, 'already exists.');
            return;
        }
        const map = new Map();
        for(const cmd in cmds)
            map.set(cmd, cmds[cmd]);
        this.#proxy.set(proxy, map);
        if(requestSid) this.#proxyR.add(proxy);
    }

    async initialize() {
        logger.info('[System]', 'initializing...');
        const start = Date.now();
        await this.#database.initialize();
        await this.#question.initialize();
        await this.#user.initialize();
        await this.#game.initialize();
        await this.#session.initialize();
        logger.info('[System]', 'initializeed in', Date.now() - start, 'ms.');
    }

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

    async command(sid, {c, d}) {
        if(!c) return { r: 0, e: this.$err.NO_CMD };
        const [p, cmd] = c.split(".");
        const proxy = this.#proxy.get(p);
        if(!proxy || !proxy.has(cmd))
            return { r: 0, e: this.$err.NO_CMD };
        let mark = sid;
        if(!this.#proxyR.has(p)) {
            if(!this.#user.isAuthenticated(sid)) return { r: 0, e: this.$err.NO_AUTH };
            mark = this.#user.uid(sid);
        }
        const result = await proxy.get(cmd)(mark, d);
        result.r = Number(result.r) || 0;
        return result;
    }

    async send(uid, cmd, data) {
        const sid = this.#user.sid(uid);
        if(!sid) return false;
        return this.#session.send(sid, {c: cmd, d: await data});
    }

    async listSend(uids, cmd, data) {
        const sids = uids.map(uid => this.#user.sid(uid)).filter(sid=>!!sid);
        if(sids.length < 1) return false;
        return this.#session.listSend(sids, {c: cmd, d: await data});
    }

    async useraction(type, ...args) {
        try{
            switch(type) {
                case 'connected':
                    return ({
                        version: "0.0.1"
                    });
                case 'message':
                    return await this.command(...args);
                case 'close':
                    return await this.user.leave(args[0]);
                case 'error':
                default:
                    return;
            }
        } catch (e) {
            console.error(e);
        }
    }

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