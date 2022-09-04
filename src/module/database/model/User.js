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
        updated: {type: Date, default: Date.now},
    };
    static SchemaOptions = {
        timestamps: {
            createdAt: 'created',
            updatedAt: 'updated',
        }
    };

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
    #cacheIt(data) {
        if (!data) return;
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
    async cache(uid, fresh = false) {
        if (this.#cache.uid.has(uid)) {
            if(!fresh) return true;
        } else if(fresh) {
            return false;
        }
        const data = await this.$find(
            {uid}, {__v: 0, _id: 0}
        ).lean();
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
        return this.$find(
            {[type]: value},
            {__v: 0, _id: 0}
        ).lean();
    }

    /**
     * @param {string} uid
     * @param {Object<string, any>} update
     * @return {Promise<boolean>}
     */
    async #update(uid, update) {
        const {acknowledged} = await this.$update({uid}, update);
        if(acknowledged) await this.cache(uid, true);
        return acknowledged;
    }

    /**
     * @async
     * @param {string} type
     * @param {string} value
     * @returns {Promise<userdata|null>}
     */
    async authenticate(username, password) {
        password = this.#encrypt(password);
        let uid = this.#cache.username.get(username);
        if(uid) {
            const local = this.#cache.uid.get(uid);
            return local.password === password
                ?clone(local) :null;
        }
        const data = await this.$find(
            {username, password}
        ).lean();
        if(!data) return null;
        this.#cacheIt(data);
        return clone(data);
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
        if(!model) return false;
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
        return this.#update(uid, {
            password: this.#encrypt(password)
        });
    }

    /**
     * 修改用户名
     * @async
     * @param {string} uid
     * @param {string} username
     */
    async changeUsername(uid, username) {
        return this.#update(uid, {username});
    }

    /**
     * 修改邮箱
     * @async
     * @param {string} uid
     * @param {string} email
     */
    async changeEmail(uid, email) {
        return this.#update(uid, {email});
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
        const models = await this.$findMany(
            { uid: { "$in": notInCache } },
            { _id: 0, __v: 0 },
        ).lean();
        return [...result, ...models];
    }

    #moneyInc(alter, r=1) {
        const $inc = {};
        for(const m in alter)
            $inc[`props.money.${m}`] = alter[m] * r;
        return $inc;
    }

    async addMoney(uid, money) {
        return this.#update(uid, {
            $inc: this.#moneyInc(money)
        });
    }

    async subMoney(uid, money) {
        return this.#update(uid, {
            $inc: this.#moneyInc(money, -1)
        });
    }

    async reward(uid, money) {
        return this.addMoney(uid, money);
    }

    async consume(uid, money) {
        const check = {uid};
        for(const m in money)
            check[`props.money.${m}`] = {
                $gte: money[m]
            };

        const {acknowledged} = await this.$update(check, {
            $inc: this.#moneyInc(money, -1)
        });
        if(acknowledged) await this.cache(uid, true);
        return acknowledged;
    }

    async setMeta(uid, metas) {
        const update = {};
        for(const m in metas) {
            const key = `meta.${m}`;
            const value = metas[m];
            if(value==null) {
                if(!update.$unset) update.$unset = {};
                update.$unset[key] = 1;
            } else {
                update[key] = value;
            }
        }

        return this.#update(uid, update);
    }
}