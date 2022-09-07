/**
 * @typedef {string} uid
 * @typedef {import('../session').sid} sid
 * @typedef {import('..').CommandResult} CommandResult
 * @typedef {{timeout: number}} configure
 */
import IModule from "../imodule.js";
import { batch } from '../../functions/index.js';

/** 用户模块 */
export default class User extends IModule {

    /** @private 已认证索引 @type {Map<sid, uid>} */
    #authenticated = new Map();
    /** @private 用户索引 @type {Map<uid, {sid: string, g: boolean|undefined}>} */
    #users = new Map();
    /** @private 游客id生成索引 @type {number} */
    #counter = 46656;
    /** @private 注册用户计数 @type {number} */
    #registerCount = 0;
    /** @private 锁定认证 @type {Set<sid|string>} */
    #lock = new Set();

    /** @readonly 注册用户计数 */
    get registerCount() {
        return this.#registerCount;
    }

    proxy() {
        return [{
            register: (sid, {username, password}) =>
                this.#register(sid, ''+username, ''+password),
            authenticate: (sid, {username, password, sync}) =>
                this.#authenticate(sid, ''+username, ''+password, sync),
            guest: sid => this.#guest(sid),
            logout: sid => this.#logout(sid),
            get: (_, uids) => this.#get(uids),
        }, true];
    }

    /**
     * @override
     * @returns {Promise<void>}
     */
    async initialize() {
        /** @type {configure} */
        const { timeout } = this.$configure;
        this.#registerCount = await this.$db.kvdata.get('register') || 0;
        const leave = new Map();
        const kick = batch(
            ()=>{
                const kickset = new Set();
                const now = Date.now();
                leave.forEach((leavetime, sid)=>{
                    if(leavetime+timeout>now) return;
                    leave.delete(sid);
                    this.#authenticated.delete(sid);
                    const uid = this.uid(sid);
                    if(!uid) return;
                    kickset.add(uid);
                    this.#users.delete(uid);
                    this.$db.usync(uid);
                });
                if(kickset.size)
                    this.$emit('user.leave', kickset);
                if(leave.size) kick();
            },
            timeout
        );
        this.$on('session.close', sid=>{
            if(!this.isAuthenticated(sid)) return;
            leave.set(sid, Date.now());
            kick();
            const uid = this.uid(sid);
            this.$emit('user.pending', uid);
        })
        this.$on('session.resume', sid=>leave.delete(sid));
    }

    /**
     * 是否已认证
     * @param {sid} sid
     */
    isAuthenticated(sid) {
        return this.#authenticated.has(sid);
    }

    /**
     * 认证
     * @private
     * @async
     * @param {sid} sid
     * @param {string} username
     * @param {string} password
     * @returns {Promise<CommandResult>}
     */
    async #authenticate(sid, username, password, sync) {
        // check username
        if(!this.#checkUsername(username)) return [this.$err.USERNAME_ERROR];

        // AUTH LIMIT
        if(this.#lock.has(sid) || this.#lock.has(username))
            return [this.$err.AUTH_LIMIT];
        this.#lock.add(sid);
        this.#lock.add(username);
        setTimeout(() => {
            this.#lock.delete(sid);
            this.#lock.delete(username);
        }, this.$configure.authLimit);
        // AUTH LIMIT

        // db authenticate
        const uid = await this.$db.user.authenticate(
            username, password
        );
        if(!uid) return [this.$err.AUTH_FAILED];
        // last session
        if(this.#users.has(uid)) {
            const {sid: last} = this.#users.get(uid);
            // kick last session
            this.$session.close(last, 3001, 'AAuth');
            this.#authenticated.delete(last);
        }
        if(sync) {
            if(sync.uid === uid) sync = sync.sync;
            else sync = null;
        }
        // record this session
        await this.$db.gsync(uid, sync);
        this.#users.set(uid, {sid});
        this.#authenticated.set(sid, uid);
        this.#lock.delete(username);
        this.$emit('user.authenticated', uid);
        return [0, {uid}];
    }

    /**
     * 游客
     * @private
     * @param {sid} sid
     * @returns {CommandResult}
     */
    #guest(sid) {
        const guestNumber = `#${(this.#counter++).toString(36)}`;
        this.#authenticated.set(sid, guestNumber);
        this.#users.set(guestNumber, {sid, g: true});
        return [0, {uid: guestNumber}];
    }

    /**
     * 注册
     * @private
     * @async
     * @param {sid} sid
     * @param {string} username
     * @param {string} password
     * @returns {Promise<CommandResult>}
     */
    async #register(sid, username, password) {
        // check username
        if(!this.#checkUsername(username)) return [1];

        // AUTH LIMIT
        if(this.#lock.has(sid)) return [this.$err.AUTH_LIMIT];
        this.#lock.add(sid);
        setTimeout(() => this.#lock.delete(sid), this.$configure.authLimit);
        // AUTH LIMIT

        // check exist
        if(await this.$db.user.findByUsername(username))
            return [1];

        // register
        const uid = (46656 + this.#registerCount + 1).toString(36); // uid by register count
        const success = await this.$db.user.create(
            uid, username, password
        );
        if(!success) return [1];
        await this.$db.kvdata.set('register', ++this.#registerCount);
        // record this session
        this.#authenticated.set(sid, uid);
        this.#users.set(uid, {sid});
        await this.$db.user.cache(uid);
        return [0, {uid}];
    }

    /**
     * 登出
     * @private
     * @param {sid} sid
     * @returns {CommandResult}
     */
    #logout(sid) {
        const uid = this.#authenticated.get(sid);
        if(!uid) return [0];

        this.#authenticated.delete(sid);
        this.#users.delete(uid);
        this.$emit('user.leave', new Set([uid]));
        this.$db.user.release(uid);
        return [0];
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
        for(const {uid, username, meta} of list) {
            datas[uid] = [username, meta];
        }
        return [0, datas];
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
     * 获取uid
     * @param {sid} sid
     * @returns {uid|undefined}
     */
    uid(sid) {
        return this.#authenticated.get(sid);
    }

    /**
     * 获取sid
     * @param {uid} uid
     * @returns {sid|undefined}
     */
    sid(uid) {
        return this.#users.get(uid)?.sid;
    }

    /**
     * 是否为游客
     * @param {uid} uid
     */
    isGuest(uid) {
        return uid[0] == '#';
    }

    async addMoney(uid, money) {
        return this.$db.user.addMoney(uid, money);
    }
}