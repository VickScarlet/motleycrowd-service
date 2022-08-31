/**
 * @typedef {[question: string, picked: string][]} questions
 * @typedef {string[]} users
 * @typedef {{
 *      [uid: string]: [
 *          total: number,
 *          ([alter: number, answer: string] | number)[]
 *      ]}
 * } scores
 */
import Base from '../base.js';
import { v4 as gid } from 'uuid';

/** 对局数据模型 */
export default class Game extends Base {
    static Name = 'Game';
    static Schema = {
        id: {type: String, required: true, unique: true, index: true},
        type: {type: Number, required: true},
        questions: {type: Array, required: true},
        users: [{type: String, required: true}],
        scores: {type: Object, required: true},
        created: { type: Date, default: Date.now },
    };

    /**
     * 存档
     * @async
     * @param {number} type
     * @param {questions} questions
     * @param {users} users
     * @param {scores} scores
     */
    async save(type, questions, users, scores) {
        return this.$create({
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
        return this.$find({id});
    }

    /**
     * 用户档案id列表
     * @async
     * @param {string} uid
     */
    async userList(uid) {
        return this.$findMany({users: uid});
    }
}