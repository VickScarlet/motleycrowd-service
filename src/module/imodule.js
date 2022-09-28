import ErrorCode from './errorcode.js';
export default class IModule {
    /**
     * @constructor
     * @typedef {import('.').default} Core
     * @param {Core} core
     * @param {Object<string, any>} configure
     * @returns {IModule}
     */
    constructor(core, configure = {}) {
        this.#$core = core;
        this.#$configure = configure;
    }

    /** @private*/
    #$core;
    /** @private*/
    #$configure;

    /**
     * @readonly
     * @abstract
     */
    get state() { return null; }
    /** @readonly */
    get $err() {return ErrorCode;}
    /** @readonly */
    get $core() { return this.#$core; }
    /** @readonly */
    get $configure() { return this.#$configure; }
    /** @readonly */
    get $db() { return this.#$core.database; }
    /** @readonly */
    get $sheet() { return this.#$core.sheet; }
    /** @readonly */
    get $user() { return this.#$core.user; }
    /** @readonly */
    get $game() { return this.#$core.game; }
    /** @readonly */
    get $session() { return this.#$core.session; }
    /** @readonly */
    get $question() { return this.#$core.question; }
    /** @readonly */
    get $rank() { return this.#$core.rank; }
    /** @readonly */
    get $asset() { return this.#$core.asset; }

    /**
     * 初始化
     * @async
     * @abstract
     * @returns {Promise<void>}
     */
    async initialize() {
        // empty
    }

    /**
     * 关闭
     * @async
     * @abstract
     * @returns {Promise<void>}
     */
    async shutdown() {
        // empty
    }

    /**
     * @typedef {import('.').CommandProxy} CommandProxy
     * @returns {{[proxy: string]: CommandProxy}}
     */
    proxy() { return null;}
}