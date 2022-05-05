import Commander from './cmd.js';

export default class Core {
    constructor() {

    }

    #cmd;

    initialize() {
        this.#cmd = new Commander()
    }

    cmd(...args) {
        return this.#cmd.do(...args);
    }
}