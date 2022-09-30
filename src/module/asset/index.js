import IModule from "../imodule.js";

export default class Asset extends IModule {

    async rewardAssets(uid, assets) {
        const result = await this.$db.asset.reward(uid, assets)
        if(!assets.money) return result;
        // record
        const record = {c: assets.money};
        await this.$db.record.records(uid, record);
        return result;
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
}