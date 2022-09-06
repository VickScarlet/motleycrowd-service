import Base from '../base.js';

/** 比分数据模型 */
export default class Score extends Base {
    static indexes = [
        { key: { uid: 1 }, unique: true },
        { key: { score: 1 } },
        { key: { count: 1 } },
        { key: { 'scores.10.s': 1 } },
        { key: { 'scores.10.c': 1 } },
        { key: { 'scores.100.s': 1 } },
        { key: { 'scores.100.c': 1 } },
    ];

    async #find(uid) {
        const data = await this.findOne({uid});
        if (data) return data;
        return {
            uid, score: 0, count: 0,
            scores: {
                10: {s: 0, a: 0, c: 0, r1: 0, r3: 0},
                100:{s: 0, a: 0, c: 0, r1: 0, r10: 0, r30: 0},
            }
        };
    }

    async #save(data) {
        const ret = await this.replaceOne(
            { uid: data.uid },
            data,
            { upsert: true },
        );
        return ret.acknowledged;
    }

    /**
     * 10人场加分
     * @param {model} model
     */
    async #calcTotal(m) {
        const c = ++m.count;
        if (c < 10) return this.#save(m);
        const {10: t, 100: h} = m.scores;
        m.score = (t.s*t.c + h.s*h.c) / c;
        return this.#save(m);
    }

    /**
     * 10人场加分
     * @param {string} uid
     * @param {number} r
     */
    async addScore10(uid, r) {
        const m = await this.#find(uid);
        let {10: {s, a, c, r1, r3}} = m.scores;
        a = (a*c + r) / ++c;
        if(r<=1) r1+=1;
        if(r<=3) r3+=1;
        s = (10-a)*c + 50*r1 + 5*r3;
        m.scores[10] = {s, a, c, r1, r3};
        return this.#calcTotal(m);
    }

    /**
     * 100人场加分
     * @param {string} uid
     * @param {number} r
     */
    async addScore100(uid, r) {
        const m = await this.#find(uid);
        let {100: {s, a, c, r1, r10, r30}} = m.scores;
        a = (a*c + r) / ++c;
        if(r<=1) r1+=1;
        if(r<=10) r10+=1;
        if(r<=30) r30+=1;
        s = (100-a)/10*c + 500*r1 + 50*r10 + 5*r30;
        m.scores[100] = {s, a, c, r1, r10, r30};
        return this.#calcTotal(m);
    }

    /**
     * @param {string} c 局数字段
     * @param {string} s 分数字段
     * @returns {Promise<{uid: string, rank: number}[]>}
     */
    async #rank(c, s) {
        return this.aggregate([
            { $match: { [c]: { $gte: 10 } } },
            { $project: { uid: 1, s: '$'+s } },
            { $setWindowFields: {
                sortBy: { s: -1 },
                output: { rank: { $rank: {} } }
            } },
            { $project: { s: 0 } },
        ]).toArray();
    }

    /** 总榜 */
    async rank() {
        return this.#rank('count', 'score');
    }

    /** 10人场榜 */
    async rank10() {
        return this.#rank('scores.10.c', 'scores.10.s');
    }

    /** 100人场榜 */
    async rank100() {
        return this.#rank('scores.100.c', 'scores.100.s');
    }
}