import Database from './database/index.js';
import User from './user.js';
import Game from './game/index.js';
import Commander from './cmd/index.js';
import Session from './session.js';

export default class Core {
    constructor({database, user, game, commander, session}) {
        this.#database = new Database(this, database);
        this.#user = new User(this, user);
        this.#game = new Game(this, game);
        this.#commander = new Commander(this, commander);
        this.#session = new Session(this, session);
    }

    #database;
    #user;
    #game;
    #commander;
    #session;

    get database() { return this.#database; }
    get user() { return this.#user; }
    get game() { return this.#game; }
    get commander() { return this.#commander; }
    get session() { return this.#session; }

    async initialize() {
        await this.#database.initialize();
        await this.#commander.initialize();
        await this.#user.initialize();
        await this.#game.initialize();
        await this.#session.initialize();
    }

    async cmd(...args) {
        const result = await this.#commander.do(...args);
        result.r = Number(result.r) || 0;
        return result;
    }

    send(uuid, cmd, data) {
        return this.#session.send(uuid, {c: cmd, d: data});
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
                return this.user.logout(args[0]);
            case 'error':
            default:
                return;
        }
    }


}