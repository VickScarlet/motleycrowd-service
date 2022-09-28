import IModule from "../imodule.js";

export default class Asset extends IModule {

    async rewardAssets(uid, assets) {
        return this.$db.asset.reward(uid, assets)
    }

    async reward(uid, rewardId) {
        const assets = this.$sheet.get('reward', rewardId, 'rewards');
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