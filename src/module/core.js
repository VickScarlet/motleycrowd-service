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

    cmd(...args) {
        return this.#cmd.do(...args);
    }

    send(uuid, cmd, data) {
        return $.send(uuid, {c: cmd, d: data});
    }

    get user() { return this.#user; }
    get game() { return this.#game; }

}