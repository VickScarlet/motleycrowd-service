/**
 * @typedef {import('mongoose').Schema} Schema
 * @typedef {import('mongoose').model} model
 * @typedef {import('../index').ModelConfigure} configure
 */
/** 比分数据模型 */
export default class Score {
    /**
     * @constructor
     * @param {Schema} Schema
     * @param {model} model
     * @param {configure} [configure={}]
     */
    constructor(Schema, model, {collection}={}) {
        this.#schema = new Schema({
            uid: {type: String, required: true, unique: true, index: true},
            score: {type: Number, default: 0},
        });
        this.#model = model('Score', this.#schema, collection);
    }
    /** @private @type {Schema} */
    #schema;
    /** @private @type {model} */
    #model;

    /**
     * 查分
     * @async
     * @param {string} uid
     * @returns {Promise<number>}
     */
    async get(uid) {
        const data = await this.#model.findOne({uid});
        if (data) return data.score;
        return 0;
    }

    /**
     * 置分
     * @async
     * @param {string} uid
     * @param {number} score
     */
    async set(uid, score) {
        return this.#model.updateOne({uid}, {score}, {upsert: true});
    }

    /**
     * 分数排行榜
     * @async
     * @returns {Promise<Array<{uid: string, score: number}>>}
     */
    async sortedList() {
        const list = await this.#model.find().sort({score: -1});
        return list.map(({uid, score}) => ({uid, score}));
    }
}