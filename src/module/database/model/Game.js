import { v4 as gid } from 'uuid';

/**
 * 对局数据模型
 * @class Game
 */
export default class Game {
    constructor(Schema, model, {collection}={}) {
        this.#schema = new Schema({
            id: {type: String, required: true, unique: true, index: true},
            type: {type: Number, required: true},
            questions: {type: Array, required: true},
            users: [{type: String, required: true}],
            scores: {type: Object, required: true},
            created: { type: Date, default: Date.now },
        });
        this.#model = model('Game', this.#schema, collection);
    }
    #schema;
    #model;

    async save(type, questions, users, scores) {
        return this.#model.create({
            id: gid(), type, questions,
            users, scores,
        });
    }

    async find(id) {
        return this.#model.findOne({id});
    }

    async userList(uid) {
        return this.#model.find({users: uid});
    }
}