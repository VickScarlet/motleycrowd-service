import Base from '../base.js';

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
    ];

    /**
     * @private
     * @type {{
     *      uid: Map<string, userdata>,
     *      username: Map<string, string>,
     *      email: Map<string, string>,
     * }}
     */
    #cache = new Map();

    /**
     * 缓存用户
     * @async
     * @param {string} uid
     * @return {Primise<boolean>}
     */
    async cache(uid) {
        if(this.#cache.has(uid))
            return true;
        const data = await this.$.findOne(
            { uid }, { projection: { _id: 0 } }
        );
        if(!data) return false;
        this.#cache.set(data.uid, data);
        return true;
    }

    /**
     * 释放缓存
     * @param {string} uid
     * @return {void}
     */
    release(uid) {
        this.#cache.delete(uid);
    }

    /**
     * 创建用户
     * @async
     * @param {string} uid
     * @param {string} username
     * @param {string} password
     */
    async create(uid, username) {
        const now = new Date();
        const data = {
            uid, meta: { username },
            created: now, updated: now,
        };
        const ret = await this.$.insertOne(data)
            .then(({acknowledged})=>acknowledged)
            .catch(()=>false);
        if(!ret) return false;
        this.#cache.set(uid, data);
        this.$sync(data);
        return true;
    }

    /**
     * 查找用户
     * @async
     * @param {string} uid
     */
    async find(uid) {
        const data = this.#cache.get(uid);
        if(data) return $utils.clone(data);
        return this.$.findOne(
            { uid },
            { projection: { _id: 0 } }
        );
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
            const data = this.#cache.get(uid);
            if(data) result.push($utils.clone(data));
            else notInCache.push(uid);
        }
        if(notInCache.length < 1) return result;
        const models = await this.$.find(
            { uid: { "$in": notInCache } },
            { projection: { _id: 0 } },
        ).toArray();
        return [...result, ...models];
    }

    /**
     * 设置元数据
     * @async
     * @param {string} uid
     * @param {Object<string, any>} meta
     */
    async setMeta(uid, meta) {
        const update = {
            $set: $utils.flat({
                meta, updated: new Date()
            }, 1)
        };
        const ret = await this.$.findOneAndUpdate(
            { uid }, update, {
                returnDocument: 'after',
                projection: { _id: 0 },
            }
        );
        if(!ret.ok) return false;
        this.$sync(uid, ret.value)
        this.#cache.set(uid, ret.value);
        return true;
    }

    async gsync(uid, update) {
        let data = this.#cache.get(uid);
        if(!data) {
            data = await this.$.findOne(
                { uid },
                { projection: { _id: 0 } }
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