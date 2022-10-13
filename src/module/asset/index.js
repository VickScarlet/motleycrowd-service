import IModule from "../imodule.js";

export default class Asset extends IModule {

    async rewardAssets(uid, assets) {
        if(assets.money) {
            // record
            const record = {c: assets.money};
            await this.$db.record.records(uid, record);
        }
        return this.$db.asset.reward(uid, assets);
    }

    async reward(uid, assets) {
        if(typeof assets === "string") {
            assets = this.$sheet.get('reward', assets, 'rewards');
        }
        if(!assets) return false;
        return this.rewardAssets(uid, assets);
    }

    async check(uid, assets) {
        return this.$db.asset.check(uid, assets);
    }

    async consume(uid, assets) {
        return this.$db.asset.consume(uid, assets)
    }

    pricing(assets, discount) {
        const flatted = $utils.flat(assets, 2);
        const o = {};
        const d = {};
        for(const [k, v] of Object.entries(flatted)) {
            let price = v;
            if(Array.isArray(price))
                price = $utils.listRandom(price);
            o[k] = price;
            if(!discount) continue;
            price = Math.round(price * discount);
            d[k] = price;
        }
        const original = $utils.buildFromFlat(o);
        if(!discount) return {price: original};
        const price = $utils.buildFromFlat(d);
        return {price, original};
    }
}