import Commander from './cmd.js';
import User from './user.js';
export default class Core {
    #user;
    #cmd;

    initialize() {
        this.#cmd = new Commander()
        this.#user = new User();
    }

    cmd(...args) {
        return this.#cmd.do(...args);
    }

    get user() { return this.#user; }

}