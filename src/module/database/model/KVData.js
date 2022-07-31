/**
 * 键值对数据模型
 * @class KVData
 */
export default class KVData {
    constructor(Schema, model, {collection}={}) {
        this.#schema = new Schema({
            key: {type: String, required: true, unique: true, index: true},
            value: {type: Schema.Types.Mixed, required: true},
        });
        this.#model = model('KVData', this.#schema, collection);
    }
    #schema;
    #model;

    async get(key) {
        const kv = await this.#model.findOne({key});
        if (kv) return kv.value;
    }

    async set(key, value) {
        return this.#model.updateOne({key}, {value}, {upsert: true});
    }
}