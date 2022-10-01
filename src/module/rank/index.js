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
        return {
            get: {
                ps: {type: 'strArray', def: null},
                do: (_, ranks)=>this.#get(ranks),
            },
            ranking: {
                ps: [{key: 'user', type: 'string', def: null}],
                do: (_, uid)=>this.#ranking(uid),
            },
        };
    }

    /** @private @type {CronJob} */
    #job;
    /** @private @type {Map<string, rank>} */
    #rank = new Map();
    /** @private @type {string} */
    #expired;

    /** @override */
    async initialize() {
        const start = Date.now();
        this.$info('initializing...');
        /** @type {configure} */
        const { cron } = this.$configure;
        this.#job = new CronJob(cron, () => this.#refresh());
        this.#job.start();
        await this.#refresh();
        this.$info('initialized in', Date.now()-start, 'ms.');
    }

    /** @override */
    async shutdown() {
        this.$info('shutdowning...');
        this.#job.stop();
        this.$info('shutdowned.');
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
            .then(d=>{
                this.#rank.set(k, d);
                this.$debug(`refreshed [${k}]`, d.rank);
            });
        const next = this.#job.nextDate();
        this.#expired = next.toJSDate().toISOString();
        await Promise.all([
            fn('main', 'rank'),
            fn('ten', 'rank10'),
            fn('hundred', 'rank100'),
        ]);
        this.$info('refreshed next on', next.toISO());
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
        return [0, { ranks, expired: this.#expired }];
    }

    /**
     * @param {uid} uid
     * @returns {CommandResult}
     */
    #ranking(uid) {
        return [0, [this.user(uid), this.#expired]];
    }

    user(uid) {
        const main = this.#rank.get('main').user;
        const ten = this.#rank.get('ten').user;
        const hundred = this.#rank.get('hundred').user;
        const ranking = {};
        if(main.has(uid))
            ranking.main = [main.get(uid), main.size];
        if(ten.has(uid))
            ranking.ten = [ten.get(uid), ten.size];
        if(hundred.has(uid))
            ranking.hundred = [hundred.get(uid), hundred.size];
        return ranking;
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
}