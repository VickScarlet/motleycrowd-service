import ErrorCode from './errorcode.js';
export default class IModule {
    /**
     * @constructor
     * @typedef {import('.').default} Core
     * @param {Core} core
     * @param {Object<string, any>} configure
     * @returns {IModule}
     */
    constructor(name, core, configure = {}) {
        this.#name = name;
        this.#$core = core;
        this.#$configure = configure;
    }

    #name = 'IModule';

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
    /** @readonly */
    get $achiv() { return this.#$core.achievement; }
    /** @readonly */
    get $shop() { return this.#$core.shop; }

    get #logger() { return $Log4js.getLogger(this.#name); }
    $trace(...args) { this.#logger.trace(...args); }
    $log(...args) { this.#logger.log(...args); }
    $debug(...args) { this.#logger.debug(...args); }
    $info(...args) { this.#logger.info(...args); }
    $warn(...args) { this.#logger.warn(...args); }
    $error(...args) { this.#logger.error(...args); }
    $fatal(...args) { this.#logger.fatal(...args); }
    $mark(...args) { this.#logger.mark(...args); }

    /**
     * 初始化
     * @async
     * @abstract
     * @returns {Promise<void>}
     */
    async initialize() {
        this.$debug('module not implemented initialize()');
    }

    /**
     * 关闭
     * @async
     * @abstract
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.$debug('module not implemented shutdown()');
    }

    /**
     * @typedef {import('.').CommandProxy} CommandProxy
     * @returns {{[proxy: string]: CommandProxy}}
     */
    proxy() { return null;}
}