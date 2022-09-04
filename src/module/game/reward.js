import { clone } from '../../functions/index.js'
export default class GameReward {
    constructor(rewards) {
        this.#rewards = new Map(rewards);
    }

    #rewards;

    get(ranking) {
        return clone(this.#rewards.get(ranking));
    }
}