import Base from '../base.js';

/** 键值对数据模型 */
export default class KVData extends Base {
    static indexes = [
        { key: { key: 1 }, unique: true },
    ];

    /**
     * 查值
     * @async
     * @param {string} key
     */
    async get(key) {
        const ret = await this.findOne(
            { key },
            { projection: { value: 1 } }
        );
        return ret?.value;
    }

    /**
     * 存值
     * @async
     * @param {string} key
     * @param {any} value
     */
    async set(key, value) {
        const ret = await this.updateOne(
            {key}, {$set: {value}}, {upsert: true}
        );
        return ret.acknowledged;
    }
}