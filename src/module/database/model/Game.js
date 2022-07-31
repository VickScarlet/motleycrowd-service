import { v4 as gid } from 'uuid';

/**
 * 对局数据模型
 * @class Game
 */
export default class Game {
    constructor(Schema, model, {collection}={}) {
        this.#schema = new Schema({
            id: {type: String, required: true, unique: true, index: true},
            limit: {type: Number, required: true},
            questions: [{
                question: {type: String, required: true},
                answer: {type: String, required: true},
            }],
            users: [{type: String, required: true}],
            answers: [{
                user: {type: String, required: true},
                answer: {type: String, required: true},
            }],
            created: { type: Date, default: Date.now },
        });
        this.#model = model('Game', this.#schema, collection);
    }
    #schema;
    #model;

    async save(limit, questions, users, answers) {
        return this.#model.create({ 
            id: gid(), limit, questions,
            users, answers,
        });
    }

    async find(id) {
        return this.#model.findOne({id});
    }

    async userList(uid) {
        return this.#model.find({users: uid});
    }
}