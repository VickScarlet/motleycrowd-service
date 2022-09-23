import Base from '../base.js';
import crypto from 'crypto';
import { clone } from '../../../functions/index.js';

/**
 * @typedef {Object} userdata
 * @property {string} uid
 * @property {string} username
 * @property {string} password
 * @property {string} email
 * @property {{}=} meta
 * @property {Date} created
 */
/** 用户数据模型 */
export default class User extends Base {
    static indexes = [
        { key: {uid: 1}, unique: true },
        { key: {username: 1}, unique: true },
        { key: {email: 1}, unique: true },
    ];

    /**
     * @private
     * @type {{
     *      uid: Map<string, userdata>,
     *      username: Map<string, string>,
     *      email: Map<string, string>,
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
    #cacheIt(data, check = false) {
        if (!data) return;
        if (check && !this.#cache.uid.has(data.uid))
            return;
        const {uid, username, email} = data;
        this.#cache.uid.set(uid, data);
        this.#cache.username.set(username, uid);
        this.#cache.email.set(email, uid);
    }

    /**
     * 缓存用户
     * @async
     * @param {string} uid
     * @return {Primise<boolean>}
     */
    async cache(uid) {
        if(this.#cache.uid.has(data.uid))
            return true;
        const data = await this.$.findOne(
            { uid },
            { projection: { _id: 0, password: 0 } }
        );
        if(!data) return false;
        this.#cacheIt(data);
        return true;
    }

    /**
     * 释放缓存
     * @param {string} uid
     * @return {void}
     */
    release(uid) {
        const data = this.#cache.uid.get(uid);
        if (!data) return;
        const {username, email} = data;
        this.#cache.uid.delete(uid);
        this.#cache.username.delete(username);
        this.#cache.email.delete(email);
    }

    /**
     * @private
     * @async
     * @param {string} type
     * @param {string} value
     * @return {Promise<userdata>}
     */
     async #findWithCache(type, value, isClone=false) {
        let uid;
        switch(type) {
            case 'username':
            case 'email':
                uid = this.#cache[type].get(value);
                break;
            case 'uid':
                uid = value;
                break;
            default: return null;
        }
        const data = this.#cache.uid.get(uid);
        if(data) return isClone ?clone(data) :data;
        return this.findOne(
            { [type]: value },
            { projection: { _id: 0, password: 0 } }
        );
    }

    /**
     * 更新用户数据
     * @param {string} uid
     * @param {Object<string, any>} update
     * @return {Promise<boolean>}
     */
    async #update(uid, update) {
        if(update.$set) update.$set.updated = new Date();
        else update.$set = { updated: new Date() };
        const ret = await this.$.findOneAndUpdate(
            { uid }, update, {
                returnDocument: 'after',
                projection: { _id: 0, password: 0 },
            }
        );
        if(ret.value) {
            this.#cacheIt(ret.value, true);
            this.$sync(uid, ret.value);
            return true;
        }
        return false;
    }

    /**
     * 认证
     * @async
     * @param {string} type
     * @param {string} value
     * @returns {Promise<userdata|null>}
     */
    async authenticate(username, password) {
        password = this.#encrypt(password);
        const data = await this.$.findOne(
            { username, password },
            { projection: { _id: 0, password: 0 } }
        );
        if(!data) return null;
        this.#cacheIt(data);
        return data.uid;
    }

    /**
     * 创建用户
     * @async
     * @param {string} uid
     * @param {string} username
     * @param {string} password
     */
    async create(uid, username, password) {
        const now = new Date();
        const data = {
            uid, username, email: uid, meta: {},
            password: this.#encrypt(password),
            created: now, updated: now,
        };
        const ret = await this.$.insertOne(data)
            .then(({acknowledged})=>acknowledged)
            .catch(()=>false);
        if(!ret) return false;
        delete data.password;
        this.#cacheIt(data);
        this.$sync(data);
        return true;
    }

    /**
     * 修改密码
     * @async
     * @param {string} uid
     * @param {string} password
     */
    async changePassword(uid, password) {
        return this.#update(uid, {$set: {
            password: this.#encrypt(password)
        }});
    }

    /**
     * 修改用户名
     * @async
     * @param {string} uid
     * @param {string} username
     */
    async changeUsername(uid, username) {
        return this.#update(uid, {$set: {username}});
    }

    /**
     * 修改邮箱
     * @async
     * @param {string} uid
     * @param {string} email
     */
    async changeEmail(uid, email) {
        return this.#update(uid, {$set: {email}});
    }

    /**
     * 查找用户
     * @async
     * @param {string} uid
     */
    async find(uid) {
        return this.#findWithCache('uid', uid, true);
    }

    /**
     * 根据用户名查找用户
     * @async
     * @param {string} username
     */
    async findByUsername(username) {
        return this.#findWithCache('username', username, true);
    }

    /**
     * 根据邮箱查找用户
     * @async
     * @param {string} email
     */
    async findByEmail(email) {
        return this.#findWithCache('email', email, true);
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
            const data = this.#cache.uid.get(uid);
            if(data) result.push(clone(data));
            else notInCache.push(uid);
        }
        if(notInCache.length < 1) return result;
        const models = await this.find(
            { uid: { "$in": notInCache } },
            { projection: { _id: 0, password: 0 } },
        );
        return [...result, ...models];
    }

    /**
     * 设置元数据
     * @async
     * @param {string} uid
     * @param {Object<string, any>} meta
     */
    async setMeta(uid, meta) {
        return this.#update(uid, {
            $set: this.$flat({meta},1)
        });
    }

    async gsync(uid, update) {
        let data = this.#cache.uid.get(uid);
        if(!data) {
            data = await this.$.findOne(
                { uid },
                { projection: { _id: 0, password: 0 } }
            );
        }
        if(!data) return;
        if(data.updated>update) {
            this.$sync(uid, [data], true);
        } else {
            this.$sync(uid, [null, data], true);
        }
    }
}