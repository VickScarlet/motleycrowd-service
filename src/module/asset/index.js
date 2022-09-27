import IModule from "../imodule.js";

export default class Asset extends IModule {
    async reward(uid, assets) {
        return this.$db.asset.reward(uid, assets)
    }

    async check(uid, assets) {
        return this.$db.asset.check(uid, assets);
    }

    async consume(uid, assets) {
        return this.$db.asset.consume(uid, assets)
    }
}