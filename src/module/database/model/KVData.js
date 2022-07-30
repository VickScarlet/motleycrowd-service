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
        const kv = await this.#model.findOne({key});
        if (kv) {
            kv.value = value;
            return kv.save();
        }
        return new this.#model({key, value}).save();
    }
}