/**
 * @typedef {import('mongoose').Schema} Schema
 * @typedef {import('mongoose').model} model
 * @typedef {import('../index').ModelConfigure} configure
 * @typedef {[question: string, picked: string][]} questions
 * @typedef {string[]} users
 * @typedef {{
 *      [uid: string]: [
 *          total: number,
 *          ([alter: number, answer: string] | number)[]
 *      ]}
 * } scores
 */
import { v4 as gid } from 'uuid';

/** 对局数据模型 */
export default class Game {
    /**
     * @constructor
     * @param {Schema} Schema
     * @param {model} model
     * @param {configure} [configure={}]
     */
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
    /** @private @type {Schema} */
    #schema;
    /** @private @type {model} */
    #model;

    /**
     * 存档
     * @async
     * @param {number} type
     * @param {questions} questions
     * @param {users} users
     * @param {scores} scores
     */
    async save(type, questions, users, scores) {
        return this.#model.create({
            id: gid(), type, questions,
            users, scores,
        });
    }

    /**
     * 查档
     * @async
     * @param {string} id
     */
    async find(id) {
        return this.#model.findOne({id});
    }

    /**
     * 用户档案id列表
     * @async
     * @param {string} uid
     */
    async userList(uid) {
        return this.#model.find({users: uid});
    }
}