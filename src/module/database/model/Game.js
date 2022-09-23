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
    static indexes = [
        { key: { id: 1 }, unique: true },
        { key: { created: 1 } },
    ];

    /**
     * 存档
     * @async
     * @param {number} type
     * @param {questions} questions
     * @param {users} users
     * @param {scores} scores
     */
    async save(type, questions, users, scores) {
        const data = {
            id: gid(), created: new Date(),
            type, questions, users, scores,
        };
        const ret = await this.$.insertOne(data);
        if(!ret.acknowledged) return null;
        return {
            id: data.id,
            created: data.created
        };
    }

    /**
     * 查档
     * @async
     * @param {string} id
     * @return {gamedata|null}
     */
    async get(id) {
        return this.$.findOne(
            { id },
            { projection: {_id: 0} }
        );
    }

    /**
     * 用户档案id列表
     * @async
     * @param {string} uid
     * @return {{id: number,  created: Date}[]}
     */
    async history(uid, update) {
        return this.$.find(
            { users: uid, created: {
                $gt: update
            } },
            { projection: {
                id: 1, created: 1,
                [`scores.${uid}`]: 1
            } }
        ).toArray();
    }
}