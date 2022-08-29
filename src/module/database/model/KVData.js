/**
 * @typedef {import('mongoose').Schema} Schema
 * @typedef {import('mongoose').model} model
 * @typedef {import('../index').ModelConfigure} configure
 */
/** 键值对数据模型 */
export default class KVData {
    /**
     * @constructor
     * @param {Schema} Schema
     * @param {model} model
     * @param {configure} [configure={}]
     */
    constructor(Schema, model, {collection}={}) {
        this.#schema = new Schema({
            key: {type: String, required: true, unique: true, index: true},
            value: {type: Schema.Types.Mixed, required: true},
        });
        this.#model = model('KVData', this.#schema, collection);
    }
    /** @private @type {Schema} */
    #schema;
    /** @private @type {model} */
    #model;

    /**
     * 查值
     * @async
     * @param {string} key
     */
    async get(key) {
        const kv = await this.#model.findOne({key});
        if (kv) return kv.value;
    }

    /**
     * 存值
     * @async
     * @param {string} key
     * @param {any} value
     */
    async set(key, value) {
        return this.#model.updateOne({key}, {value}, {upsert: true});
    }
}