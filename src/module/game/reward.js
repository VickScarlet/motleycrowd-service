export default class GameReward {
    constructor(rewards) {
        this.#rewards = new Map(rewards);
    }

    #rewards;

    get(ranking) {
        return $utils.clone(this.#rewards.get(ranking));
    }
}