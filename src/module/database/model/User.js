import Base from '../base.js';
import crypto from 'crypto';

/**
 * @typedef {Object} userdata
 * @property {string} uid
 * @property {string} username
 * @property {string} password
 * @property {string} email
 * @property {{}=} meta
 * @property {{}=} props
 * @property {Date} created
 */
/** 用户数据模型 */
export default class User extends Base {
    static Name = 'User';
    static Schema = {
        uid: {type: String, required: true, unique: true, index: true},
        username: {type: String, required: true, unique: true, index: true},
        password: {type: String, required: true},
        email: {type: String, unique: true, index: true},
        meta: {type: Object, default: {}},
        props: {type: Object, default: {}},
        created: {type: Date, default: Date.now},
    };

    /**
     * @typedef {import('mongoose').Document} model
     */
    /**
     * @private
     * @type {{
     *      uid: Map<string, model>,
     *      username: Map<string, model>,
     *      email: Map<string, model>,
     * }}
     */
    #cache = {
        uid: new Map(),
        username: new Map(),
        email: new Map(),
    };

    /**
     * 缓存用户
     * @private
     * @param {model} model
     * @return {void}
     */
    #cacheIt(model) {
        if (!model) return;
        const {uid, username, email} = model;
        this.#cache.uid.set(uid, model);
        this.#cache.username.set(username, model);
        this.#cache.email.set(email, model);
    }

    /**
     * 缓存用户
     * @async
     * @param {string} uid
     * @return {Primise<boolean>}
     */
    async cache(uid) {
        if (this.#cache.uid.has(uid)) return true;
        const model = await this.$find({uid});
        if(!model) return false;
        this.#cacheIt(model);
        return true;
    }

    /**
     * 释放缓存
     * @param {string} uid
     * @return {void}
     */
    release(uid) {
        const model = this.#cache.uid.get(uid);
        if (!model) return;
        const {username, email} = model;
        this.#cache.uid.delete(uid);
        this.#cache.username.delete(username);
        this.#cache.email.delete(email);
    }

    /**
     * @async
     * @param {string} type
     * @param {string} value
     * @returns {Promise<userdata|null>}
     */
    async authenticate(username, password) {
        password = this.#encrypt(password);
        let model = this.#cache.username.get(username);
        if(model) return model.password === password
                ?model.toJSON() :null;
        model = await this.$find({username, password});
        if(!model) return null;
        this.#cacheIt(model);
        return model.toJSON();
    }

    /**
     * 创建用户
     * @async
     * @param {string} uid
     * @param {string} username
     * @param {string} password
     */
    async create(uid, username, password) {
        const model = await this.$create({
            uid, username, email: uid,
            password: this.#encrypt(password),
        });
        this.#cacheIt(model);
        return true;
    }

    /**
     * 修改密码
     * @async
     * @param {string} uid
     * @param {string} password
     */
    async changePassword(uid, password) {
        password = this.#encrypt(password);
        const model = this.#cache.uid.get(uid);
        if(!model) {
            const result = await this.$update({uid}, {password});
            return result.matchedCount > 0;
        }
        model.password = password;
        await model.save();
        return true;
    }

    /**
     * 修改用户名
     * @async
     * @param {string} uid
     * @param {string} username
     */
    async changeUsername(uid, username) {
        const hasUser = await this.#findWithCache('username', username);
        if(hasUser) return false;
        const model = this.#cache.uid.get(uid);
        if(!model) {
            await this.$update({uid}, {username});
            return true;
        }
        this.#cache.username.delete(model.username);
        this.#cache.username.set(username, model);
        model.username = username;
        await model.save();
        return true;
    }

    /**
     * 修改邮箱
     * @async
     * @param {string} uid
     * @param {string} email
     */
    async changeEmail(uid, email) {
        const hasUser = await this.#findWithCache('email', email);
        if(hasUser) return false;
        const model = this.#cache.uid.get(uid);
        if(!model) {
            await this.$update({uid}, {email});
            return true;
        }
        this.#cache.email.delete(model.email);
        this.#cache.email.set(email, model);
        model.email = email;
        await model.save();
        return true;
    }

    /**
     * @private
     * @async
     * @param {string} type
     * @param {string} value
     */
    async #findWithCache(type, value) {
        switch(type) {
            case 'uid':
            case 'username':
            case 'email': break;
            default: return null;
        }
        if(this.#cache[type].has(value))
            return this.#cache[type].get(value);
        return this.$find({[type]: value});
    }

    /**
     * @private
     * @async
     * @param {string} type
     * @param {string} value
     * @returns {Promise<userdata|null>}
     */
    async #findObjectWithCache(type, value) {
        const model = await this.#findWithCache(type, value);
        if(!model) return null;
        return model.toJSON();
    }

    /**
     * 查找用户
     * @async
     * @param {string} uid
     */
    async find(uid) {
        return this.#findObjectWithCache('uid', uid);
    }

    /**
     * 根据用户名查找用户
     * @async
     * @param {string} username
     */
    async findByUsername(username) {
        return this.#findObjectWithCache('username', username);
    }

    /**
     * 根据邮箱查找用户
     * @async
     * @param {string} email
     */
    async findByEmail(email) {
        return this.#findObjectWithCache('email', email);
    }

    /**
     * 密码加密
     * @private
     * @param {password} password
     */
     #encrypt(password) {
        const sha256 = crypto.createHash('sha256').update(password).digest('hex');
        const md5 = crypto.createHash('md5').update(password).digest('hex');
        return crypto.createHash('sha256').update(sha256 + md5).digest('hex');
    }

    /**
     * 列表查找
     * @async
     * @param {string[]} uids
     * @returns {Promise<userdata[]>}
     */
    async findList(uids) {
        const notInCache = [];
        const result = [];
        for (const uid of uids) {
            const model = this.#cache.uid.get(uid);
            if(model) result.push(model.toJSON());
            else notInCache.push(uid);
        }
        if(notInCache.length < 1) return result;
        const models = await this.$findMany({
            uid: { "$in": notInCache }
        });
        return [
            ...result,
            ...models.map(model=>model.toJSON())
        ];
    }
}