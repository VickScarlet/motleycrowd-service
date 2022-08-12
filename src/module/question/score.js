export default class Score {
    constructor(users) {
        for(const uuid of users) {
            this.#map.set(uuid, 0);
        }
    }
    #map = new Map();
    #buff = new Map();

    get rankings() {
        return Array.from(this.#map.entries())
            .sort((a, b)=>b[1]-a[1])
            .map(([uuid, score])=>({uuid, score}));
    }

    get map() {return this.#map;}
    get obj() {return Object.fromEntries(this.#map.entries());}


    buff(uuid, buff) {
        this.#buff.set(uuid, buff);
    }

    #gbuff(uuid) {
        if(!this.#buff.has(uuid)) return 1;
        const buff = this.#buff.get(uuid);
        this.#buff.delete(uuid);
        return buff;
    }

    change(uuid, score) {
        const buff = this.#gbuff(uuid);
        const buffedScore = this.get(uuid) + score * buff;
        this.#map.set(uuid, Number(buffedScore.toFixed(2)));
    }

    get(uuid) {
        return this.#map.get(uuid)||0;
    }

}