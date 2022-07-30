export default class Score {
    constructor(Schema, model, {collection}={}) {
        this.#schema = new Schema({
            uid: {type: String, required: true, unique: true, index: true},
            score: {type: Number, default: 0},
        });
        this.#model = model('Score', this.#schema, collection);
    }
    #schema;
    #model;

    async get(uid) {
        const data = await this.#model.findOne({uid});
        if (data) return data.score;
        return 0;
    }

    async set(uid, score) {
        const data = await this.#model.findOne({uid});
        if (data) {
            data.score = score;
            return data.save();
        }
        return new this.#model({uid, score}).save();
    }

    async sortedList() {
        return this.#model.find().sort({score: -1});
    }
}