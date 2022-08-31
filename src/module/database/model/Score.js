import Base from '../base.js';

/** 比分数据模型 */
export default class Score extends Base {
    static Name = 'Score';
    static Schema = {
        uid: {type: String, required: true, unique: true, index: true},
        score: {type: Number, default: 0},
    };

    /**
     * 查分
     * @async
     * @param {string} uid
     * @returns {Promise<number>}
     */
    async get(uid) {
        const data = await this.$find({uid});
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
        return this.$update({uid}, {score}, {upsert: true});
    }

    /**
     * 分数排行榜
     * @async
     * @returns {Promise<Array<{uid: string, score: number}>>}
     */
    async sortedList() {
        const list = await this.$findMany().sort({score: -1});
        return list.map(({uid, score}) => ({uid, score}));
    }
}