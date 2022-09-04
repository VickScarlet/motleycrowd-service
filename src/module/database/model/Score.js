import Base from '../base.js';

/** 比分数据模型 */
export default class Score extends Base {
    static Name = 'Score';
    static Schema = {
        uid: {type: String, required: true, unique: true, index: true},
        scores: {type: Object, default: {}},
        score: {type: Number, default: 0},
        count: {type: Number, default: 0},
    };

    /**
     * @param {string} uid
     * @return {Promise<model>}
     */
    async #findOrCreate(uid) {
        const model = await this.$find({uid});
        if (model) return model;
        return this.$create({uid, scores: {
            10: {s: 0, a: 0, c: 0, r1: 0, r3: 0},
            100:{s: 0, a: 0, c: 0, r1: 0, r10: 0, r30: 0},
        }});
    }

    /**
     * @typedef {import('mongoose').Document} model
     */
    /**
     * @param {model} model
     */
    async #save(model) {
        await model.save();
        return true;
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
        const m = await this.#findOrCreate(uid);
        let {10: {s, a, c, r1, r3}, ...ss} = m.scores;
        a = (a*c + r) / ++c;
        if(r<=1) r1+=1;
        if(r<=3) r3+=1;
        s = (10-a)*c + 50*r1 + 5*r3;
        m.scores = {10: {s, a, c, r1, r3}, ...ss};
        return this.#calcTotal(m);
    }

    /**
     * 100人场加分
     * @param {string} uid
     * @param {number} r
     */
    async addScore100(uid, r) {
        const m = await this.#findOrCreate(uid);
        let {100: {s, a, c, r1, r10, r30}, ...ss} = m.scores;
        a = (a*c + r) / ++c;
        if(r<=1) r1+=1;
        if(r<=10) r10+=1;
        if(r<=30) r30+=1;
        s = (100-a)/10*c + 500*r1 + 50*r10 + 5*r30;
        m.scores = {100: {s, a, c, r1, r10, r30}, ...ss};
        return this.#calcTotal(m);
    }

    /**
     * @param {string} c 局数字段
     * @param {string} s 分数字段
     * @returns {Promise<{uid: string, rank: number}[]>}
     */
    async #rank(c, s) {
        return this.$aggregate([
            { $match: { [c]: { $gte: 10 } } },
            { $project: { uid: 1, s: '$'+s } },
            { $setWindowFields: {
                sortBy: { s: -1 },
                output: { rank: { $rank: {} } }
            } },
            { $project: { _id: 0, s: 0 } },
        ]);
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