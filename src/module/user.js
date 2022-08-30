/**
 * @typedef {string} uid
 * @typedef {import('./session').sid} sid
 * @typedef {import('./index').CommandResult} CommandResult
 * @typedef {import('./database/index').doc} model
 * @typedef {{timeout: number}} configure
 */
import crypto from 'crypto';
import IModule from "./imodule.js";
import { batch } from '../functions/index.js';

/** 用户模块 */
export default class User extends IModule {

    /** @private 已认证索引 @type {Map<sid, uid>} */
    #authenticated = new Map();
    /** @private 用户索引 @type {Map<uid, {sid: string, model: model|undefined, g: boolean|undefined}>} */
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

    /**
     * @override
     * @returns {Promise<void>}
     */
    async initialize() {
        /** @type {configure} */
        const { timeout } = this.$configure;
        this.#registerCount = await this.$core.database.kvdata.get('register') || 0;
        this.$core.proxy('user', {
            register: (sid, {username, password}) => this.#register(sid, ''+username, ''+password),
            authenticate: (sid, {username, password}) => this.#authenticate(sid, ''+username, ''+password),
            guest: sid => this.#guest(sid),
            logout: sid => this.#logout(sid),
            get: (_, {uids}) => this.#get(uids),
        }, true);
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
    async #authenticate(sid, username, password) {
        // check username
        if(!this.#checkUsername(username)) return [this.$err.NO_USER];

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

        // query db
        const model = await this.$core.database.user.findUserByUsername(username);
        // not found
        if(!model) return [this.$err.NO_USER];
        // founded
        const {uid} = model;
        // check password
        if(model.password !== this.#passwordEncrypt(password)) return [this.$err.PASSWORD_ERROR];
        // last session
        if(this.#users.has(uid)) {
            const {sid: last} = this.#users.get(uid);
            // kick last session
            this.$core.session.close(last, 3001, 'AAuth');
            this.#authenticated.delete(last);
        }
        // record this session
        this.#users.set(uid, {sid, model});
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
        if(await this.$core.database.user.findUserByUsername(username))
            return [1];

        // register
        const uid = (46656 + ++this.#registerCount).toString(36); // uid by register count
        await this.$core.database.kvdata.set('register', this.#registerCount);
        const model = await this.$core.database.user.create(uid, username, this.#passwordEncrypt(password));

        // record this session
        this.#authenticated.set(sid, uid);
        this.#users.set(uid, {sid, model});
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
        uids = new Set(uids);
        for(let uid of uids) {
            /** @type {model} */
            const model = await this.model(''+uid);
            if(!model) continue;
            datas[uid] = [
                model.username,
                model.meta
            ];
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
     * 获取用户数据
     * @param {uid} uid
     */
    async data(uid) {
        if(this.isGuest(uid)) return {uid, guest: true};
        /** @type {model} */
        const model = await this.model(uid);
        if(!model) return null;
        return model.toJSON();
    }

    /**
     * 获取用户model
     * @param {uid} uid
     * @returns {doc|Promise<doc>|undefined}
     */
    async model(uid) {
        if (this.isGuest(uid)) return null;
        if (this.#users.has(uid))
            return this.#users.get(uid).model;
        return this.$core.database.user.find(uid);
    }

    /**
     * 是否为游客
     * @param {uid} uid
     */
    isGuest(uid) {
        return uid[0] == '#';
    }

    /**
     * 密码加密
     * @param {password} password
     */
    #passwordEncrypt(password) {
        const sha256 = crypto.createHash('sha256').update(password).digest('hex');
        const md5 = crypto.createHash('md5').update(password).digest('hex');
        return crypto.createHash('sha256').update(sha256 + md5).digest('hex');
    }

}