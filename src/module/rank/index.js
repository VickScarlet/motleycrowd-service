/**
 * @typedef {import('./user').uid} uid
 * @typedef {number} ranking
 * @typedef {import('.').CommandResult} CommandResult
 * @typedef {{cron: string}} configure
 * @typedef {Object} rank
 * @property {[uid, ranking][]} rank
 * @property {Map<uid, ranking>} user
 */
import IModule from "../imodule.js";
import { CronJob } from "cron";

/** 排行榜模块 */
export default class Rank extends IModule {
    proxy() {
        return [{
            get: (_, ranks) => this.#get(ranks),
            ranking: (uid) => this.#ranking(uid),
        }, true];
    }

    /** @private @type {CronJob} */
    #job;
    /** @private @type {Map<string, rank>} */
    #rank = new Map();
    /** @private @type {string} */
    #update;

    /** @override */
    async initialize() {
        /** @type {configure} */
        const { cron } = this.$configure;
        this.#job = new CronJob(cron, () => this.#refresh());
        await this.#refresh();
    }

    /** @override */
    async shutdown() {
        this.#job.stop();
    }

    /**
     * 刷新榜单
     * @async
     * @private
     */
    async #refresh() {
        const fn = (k, g) => this.$db.score[g]()
            .then(r=>r.map(({uid, rank})=>([uid, rank])))
            .then(r=>({rank: r.slice(0, 100),user: new Map(r)}))
            .then(d=>this.#rank.set(k, d));
        this.#update = new Date().toISOString();
        return Promise.allSettled([
            fn('main', 'rank'),
            fn('ten', 'rank10'),
            fn('hundred', 'rank100'),
        ]);
    }

    /**
     * @param {string[]} ranks
     * @returns {CommandResult}
     */
    #get(ranks) {
        if(!Array.isArray(ranks))
            return [this.$err.PARAM_ERROR];
        const list = ranks.filter(r=>this.#rank.has(r));
        ranks = {};
        for(const rank of list)
            ranks[rank] = this.#rank.get(rank).rank;
        return [0, { ranks, update: this.#update }];
    }

    /**
     * @param {uid} uid
     * @returns {CommandResult}
     */
    #ranking(uid) {
        return [0, {
            update: this.#update,
            ranking: {
                main: this.#rank.get('main').user.get(uid),
                ten: this.#rank.get('ten').user.get(uid),
                hundred: this.#rank.get('hundred').user.get(uid),
            }
        }];
    }

    /**
     * @param {uid} uid
     * @param {10|100} type
     * @param {ranking} ranking
     * @returns {Promise<boolean>}
     */
    async addScore(uid, type, ranking) {
        switch(type) {
            case 10:
                return this.$db.score.addScore10(uid, ranking);
            case 100:
                return this.$db.score.addScore100(uid, ranking);
            default: return false;
        }
    }

    async reward(uid, { ranking: [type, ranking] }) {
        return this.addScore(uid, type, ranking);
    }
}