import Base from '../base.js';
import mongoose from 'mongoose';
const {Schema} = mongoose;

/** 键值对数据模型 */
export default class KVData extends Base {
    static Name = 'KVData';
    static Schema = {
        key: {type: String, required: true, unique: true, index: true},
        value: {type: Schema.Types.Mixed, required: true},
    };

    /**
     * 查值
     * @async
     * @param {string} key
     */
    async get(key) {
        const kv = await this.$find({key});
        if (kv) return kv.value;
    }

    /**
     * 存值
     * @async
     * @param {string} key
     * @param {any} value
     */
    async set(key, value) {
        const {
            matchedCount, modifiedCount, upsertedCount
        } = await this.$update({key}, {value}, {upsert: true});
        return matchedCount + modifiedCount + upsertedCount > 0;
    }
}