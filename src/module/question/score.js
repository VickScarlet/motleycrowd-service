export default class Score {
    #map = new Map();
    #buff = new Map();

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
        this.#map.set(uuid, this.get(uuid) + score * buff);
    }

    get(uuid) {
        return this.#map.get(uuid)||0;
    }

}