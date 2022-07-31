import Database from './database/index.js';
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
    constructor({database, user, game, session}) {

        this.#database = new Database(this, database);
        this.#user = new User(this, user);
        this.#game = new Game(this, game);
        this.#session = new Session(this, session);
        
        process.on('SIGINT', async ()=>{
            console.info('[System] recived SIGINT');
            await this.shutdown();
            process.exit(0);
        });

        process.on('exit', ()=>{
            console.info('[System]', 'bye.');
        });
    }

    #proxy = new Map();
    #proxyR = new Set();
    #database;
    #user;
    #game;
    #session;

    get database() { return this.#database; }
    get user() { return this.#user; }
    get game() { return this.#game; }
    get session() { return this.#session; }

    proxy(proxy, cmds, requestSid) {
        if(this.#proxy.has(proxy)) {
            console.info('[System] proxy <%s> %s', proxy, 'already exists.');
            return;
        }
        const map = new Map();
        for(const cmd in cmds) 
            map.set(cmd, cmds[cmd]);
        this.#proxy.set(proxy, map);
        if(requestSid) this.#proxyR.add(proxy);
    }

    async initialize() {
        await this.#database.initialize();
        await this.#user.initialize();
        await this.#game.initialize();
        await this.#session.initialize();
    }

    async shutdown() {
        console.info('[System]', 'shutdowning...');
        await this.#session.shutdown();
        await this.#game.shutdown();
        await this.#user.shutdown();
        await this.#database.shutdown();
        console.info('[System]', 'shutdowned.');
    }

    async cmd(sid, {c, d}) {
        if(!c) return { r: 0, e: $err.NO_CMD };
        const [p, cmd] = c.split(".");
        const proxy = this.#proxy.get(p);
        if(!proxy || !proxy.has(cmd))
            return { r: 0, e: $err.NO_CMD };
        let mark = sid;
        if(!this.#proxyR.has(p)) {
            if(!this.#user.isAuthenticated(sid)) return { r: 0, e: $err.NO_AUTH };
            mark = this.#user.uid(sid);
        }
        const result = await proxy.get(cmd)(mark, d);
        result.r = Number(result.r) || 0;
        return result;
    }

    send(uid, cmd, data) {
        const sid = this.#user.sid(uid);
        if(!sid) return;
        return this.#session.send(sid, {c: cmd, d: data});
    }

    useraction(type, ...args) {
        switch(type) {
            case 'connected':
                return ({
                    version: "0.0.1"
                });
            case 'message':
                return this.cmd(...args);
            case 'close':
                return this.user.leave(args[0]);
            case 'error':
            default:
                return;
        }
    }

    get state() {
        const { title, pid, platform } = process;
        const { online } = this.#session;
        return {
            title, pid, platform,
            memory: process.memoryUsage(),
            session: { online },
        };
    }

}