/**
 * 核心模块接口
 * @interface IModule
 * @param {Core} core 核心对象
 * @param {object} configure 配置对象
 * @property {function} initialize 初始化模块方法
 * @property {function} shutdown 关闭模块方法
 * @property {object} $core 获取父级模块
 * @property {object} $configure 获取配置信息
 */
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

    async shutdown() {
        // empty
    }

    get $core() { return this.#core; }
    get $configure() { return this.#configure; }
}