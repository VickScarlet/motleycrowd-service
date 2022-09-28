/**
 * @typedef {string} uid
 * @typedef {import('..').CommandResult} CommandResult
 * @typedef {{timeout: number}} configure
 */
import IModule from "../imodule.js";

/** 用户模块 */
export default class User extends IModule {
    /** @private 游客id生成索引 @type {number} */
    #counter = 46656;
    /** @private 注册用户计数 @type {number} */
    #registerCount = 0;

    /** @readonly 注册用户计数 */
    get registerCount() {
        return this.#registerCount;
    }

    proxy() {
        return {
            get: {
                ps: {type: 'strArray', def: null},
                do: (_, uids) => this.#get(uids),
            }
        };
    }

    /**
     * @override
     * @returns {Promise<void>}
     */
    async initialize() {
        /** @type {configure} */
        this.#registerCount = await this.$db.kvdata.get('register') || 0;
        $on('session.leave', uid => this.logout(uid));
    }

    /**
     * 认证
     * @private
     * @async
     * @param {string} username
     * @param {string} password
     * @returns {Promise<CommandResult>}
     */
    async authenticate(username, password) {
        // check username
        if(!this.#checkUsername(username)) return [this.$err.USERNAME_ERROR];

        // db authenticate
        const ret = await this.$db.auth.authenticate(
            username, password
        );
        if(!ret) return [this.$err.AUTH_FAILED];
        const {uid, banned} = ret;
        if(banned) return [-1];
        await this.$db.user.cache(uid);
        $emit('user.authenticated', uid);
        $l.user.debug('auth', uid);
        return [0, uid];
    }

    /**
     * 注册
     * @private
     * @async
     * @param {string} username
     * @param {string} password
     * @returns {Promise<CommandResult>}
     */
     async register(username, password) {
        // check username
        if(!this.#checkUsername(username)) return [1];

        // check exist
        if(await this.$db.auth.findByUsername(username))
            return [this.$err.COMMON_ERR];

        // register
        const uid = (46656 + this.#registerCount + 1).toString(36); // uid by register count
        const success = await this.$db.auth.create(
            uid, username, password
        );
        if(!success) return [1];
        await this.$db.kvdata.set('register', ++this.#registerCount);
        await this.$db.user.create(uid, username);
        $l.user.debug('regs', uid, username);
        return [0, uid];
    }

    /**
     * 检查用户名合法性
     * @private
     * @param {string} username
     * @returns {boolean}
     */
     #checkUsername(username) {
        if(typeof username !== 'string') return false;
        if(username.length < 1) return false;
        return username.length <= 24;
    }

    /**
     * 游客
     * @private
     * @returns {CommandResult}
     */
    guest() {
        return [0, `#${(this.#counter++).toString(36)}`];
    }

    /**
     * 是否为游客
     * @param {uid} uid
     */
    isGuest(uid) {
        return uid[0] == '#';
    }

    /**
     * 登出
     * @private
     * @param {uid} uid
     * @returns {CommandResult}
     */
    logout(uid) {
        $emit('user.logout', uid);
        this.$db.user.release(uid);
        return [0];
    }

    async addMoney(uid, money) {
        return this.$db.user.addMoney(uid, money);
    }

    /**
     * 获取用户数据
     * @private
     * @param {uid[]} uids
     * @returns {Promise<CommandResult>}
     */
    async #get(uids) {
        if(!Array.isArray(uids)) return [this.$err.PARAM_ERROR];
        const datas = {};
        uids = uids.map(uid=>''+uid);
        uids = [...new Set(uids)].filter(uid=>!this.isGuest(uid));
        const list = await this.$db.user.findList(uids);
        for(const {uid, meta} of list) {
            datas[uid] = meta;
        }
        return [0, datas];
    }
}