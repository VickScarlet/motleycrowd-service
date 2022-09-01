/**
 * @typedef {[question: string, picked: string][]} questions
 * @typedef {string[]} users
 * @typedef {{
 *      [uid: string]: [
 *          total: number,
 *          ([alter: number, answer: string] | number)[]
 *      ]}
 * } scores
 * @typedef {Object} gamedata
 * @property {string} id
 * @property {number} type
 * @property {questions} questions
 * @property {scores} scores
 * @property {string[]} users
 * @property {Date} created
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
    static SchemaOptions = {
        timestamps: {
            createdAt: 'created',
        }
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
        await this.$create({
            id: gid(), type, questions,
            users, scores,
        });
        return true;
    }

    /**
     * 查档
     * @async
     * @param {string} id
     * @return {gamedata|null}
     */
    async find(id) {
        return this.$find({id}, {__v: 0, _id: 0}).lean();
    }

    /**
     * 用户档案id列表
     * @async
     * @param {string} uid
     * @return {{id: number,  created: Date}[]}
     */
    async userList(uid) {
        return this.$findMany(
            {users: uid},
            {_id: 0, id: 1, created: {
                $dateToString: "YYYY-MM-DD HH:mm:ss"
            }}
        ).lean();
    }
}