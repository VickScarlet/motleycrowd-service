import ErrorCode from './errorcode.js';
export default class IModule {
    /**
     * @constructor
     * @typedef {import('./index').default} Core
     * @param {Core} core
     * @param {object} configure
     * @returns {IModule}
     */
    constructor(core, configure = {}) {
        this.#$core = core;
        this.#$configure = configure;
    }

    /** @private @typedef {Core} */
    #$core;
    /** @private @typedef {object} */
    #$configure;

    /**
     * @readonly
     * @abstract
     */
    get state() { return null; }
    /** @readonly 错误码 @type {ErrorCode} */
    get $err() {return ErrorCode;}
    /** @readonly @type {Core} */
    get $core() { return this.#$core; }
    /** @readonly 配置 @type {Object<string, any>} */
    get $configure() { return this.#$configure; }
    /** @readonly @type {function} */
    get $on() { return this.#$core.on.bind(this.#$core); }
    /** @readonly @type {function} */
    get $off() { return this.#$core.off.bind(this.#$core); }
    /** @readonly @type {function} */
    get $emit() { return this.#$core.emit.bind(this.#$core); }

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

}