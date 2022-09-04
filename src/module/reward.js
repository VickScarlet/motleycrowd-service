import IModule from "./imodule.js";

export default class Reward extends IModule {
    async reward(uid, reward) {
        const result = await Promise.allSettled(
            Object.keys(reward)
                .map(type=>this.#reward(
                    uid, type, reward[type]
                ))
        );
        for(const r of result)
            if(!r) return false;
        return true;
    }

    async #reward(uid, type, reward) {
        switch(type) {
            case "money":
                return this.$user.addMoney(uid, reward);
            case "rank":
                return this.$rank.addScore(uid, ...reward);
            default:
                return false;
        }
    }
}