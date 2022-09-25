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
    /** @readonly 错误码 */
    get $err() {return ErrorCode;}
    /** @readonly */
    get $core() { return this.#$core; }
    /** @readonly 配置 */
    get $configure() { return this.#$configure; }
    /** @readonly @type {import('.').on} */
    get $on() { return this.#$core.on.bind(this.#$core); }
    /** @readonly @type {import('.').off} */
    get $off() { return this.#$core.off.bind(this.#$core); }
    /** @readonly @type {import('.').emit} */
    get $emit() { return this.#$core.emit.bind(this.#$core); }
    /** @readonly */
    get $db() { return this.#$core.database; }
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