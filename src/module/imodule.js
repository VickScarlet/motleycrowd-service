export default class IModule {
    constructor(core, configure = {}) {
        this.#core = core;
        this.#configure = configure;
    }

    #core;
    #configure;
    async initialize() {
        // empty
    }

    get $core() { return this.#core; }
    get $configure() { return this.#configure; }
}