import Commander from './cmd/index.js';
import User from './user.js';
import Game from './game/index.js';

export default class Core {
    #user;
    #cmd;
    #game;

    initialize() {
        this.#cmd = new Commander(this)
        this.#user = new User(this);
        this.#game = new Game(this);
    }

    async cmd(...args) {
        const result = await this.#cmd.do(...args);
        result.r = Number(result.r) || 0;
        return result;
    }

    send(uuid, cmd, data) {
        return $.send(uuid, {c: cmd, d: data});
    }

    get user() { return this.#user; }
    get game() { return this.#game; }

}