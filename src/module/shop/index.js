import IModule from "../imodule.js";
import { CronJob } from "cron";

export default class Shop extends IModule {
    proxy() {
        return {
            shelves: { do: _ => this.shelves() },
            buy: {
                ps: [
                    {key: 0, type: 'string', default: ''},
                    {key: 1, type: 'number', default: 0},
                    {key: 2, type: 'string', default: ''},
                ],
                do: (uid, type, idx, good) => this.buy(uid, type, idx, good),
            }
        };
    }

    /** @private @type {CronJob} */
    #job;
    #shelves;
    #config;

    /** @override */
    async initialize() {
        const start = Date.now();
        this.$info('initializing...');
        /** @type {configure} */
        const { cron, sheleves } = this.$configure;
        this.#config = sheleves;
        const lastShelves = await this.$db.kvdata.get('ShopShelves');
        this.#job = new CronJob(cron, () => this.restocking());
        this.#job.start();
        this.#shelves = lastShelves;
        if(!lastShelves ||
            this.#job.nextDate().toJSDate()
            > lastShelves.expired
        ) await this.restocking();
        this.$debug('shelves', $yaml.dump(this.#shelves));
        this.$info('initialized in', Date.now()-start, 'ms.');
    }

    async restocking() {
        const goods = this.#pick();
        const expired = this.#job.nextDate().toJSDate();
        const shelevs = { goods, expired };
        this.#shelves = shelevs;
        this.$debug('restocking', $yaml.dump(shelevs));
        await this.$db.kvdata.set('ShopShelves', shelevs);
    }

    #pick() {
        const config = this.#config;
        const sheleves = {};
        const pick = (type, count, discounts=[]) => {
            const allGoods = this.$sheet.keys('goods', type);
            return allGoods
                .sort(_=>Math.random() - 0.5)
                .slice(0, count)
                .map((good, i)=>{
                    const consume = this.$sheet.get('goods', type, good, 'consume');
                    const rewards = this.$sheet.get('goods', type, good, 'rewards');
                    const discount = discounts[i];
                    const {price, original} = this.$asset.pricing(consume, discount);
                    if(!discount) return { good, price, rewards };
                    return { good, price, rewards, original, discount };
                });
        };
        for(const type in config) {
            const {count, discounts} = config[type];
            sheleves[type] = pick(type, count, discounts);
        }
        return sheleves;
    }

    async shelves() {
        return [0, this.#shelves];
    }

    async buy(uid, type, idx, good) {
        if(!type || !good) return [this.$err.PARAM_ERROR];
        const {goods} = this.#shelves;
        if(!goods[type] || !goods[type][idx]
            || goods[type][idx].good != good
        ) return [this.$err.PARAM_ERROR];
        const {price, rewards, discount} = goods[type][idx];
        if(!await this.$asset.consume(uid, price))
            return [this.$err.ASSET_NOT_ENOUTH];
        await this.$asset.reward(uid, rewards);
        if(discount < 1)
            await this.$db.record.records(
                uid, { c: { discount: 1 } }
            );
        return [0];
    }

}