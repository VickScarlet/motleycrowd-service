export default class Answer {
    constructor({options}) {
        this.#options = new Set(options);
        options.forEach(ans => {
            this.#counter.set(ans, 0)
        });
    }
    #map = new Map();
    #counter = new Map();
    #options;

    get size() { return this.#map.size; }
    get counter() { return this.#counter; }

    entries() {
        return this.#map.entries();
    }

    forEach(callback) {
        this.#map.forEach((value, key)=>callback(key, value, this));
    }

    answer(uuid, answer) {
        if(this.#map.has(uuid) || !this.#options.has(answer))
            return false;
        this.#map.set(uuid, answer);
        this.#counter.set(answer, (this.#counter.get(answer)) + 1);
        return true;
    }

    has(uuid) {
        return this.#map.has(uuid);
    }

    get(uuid) {
        return this.#map.has(uuid)
            ? this.#map.get(uuid)
            : null;
    }

    count(answer) {return this.#counter.get(answer) || 0;}

    most(answer, only=false) {
        const count = this.count(answer);
        for(const option of Array.from(this.#options)) {
            if(option == answer) continue;
            if( this.count(option) > count
                || only && this.count(option) == count
            ) return false;
        }
        return true;
    }

    least(answer, only=false) {
        const count = this.count(answer);
        for(const option of Array.from(this.#options)) {
            if(option == answer) continue;
            if( this.count(option) < count
                || only && this.count(option) == count
            ) return false;
        }
        return true;
    }

    same(answer) {
        const count = this.count(answer);
        let same = 0;

        this.#options.forEach(option =>{
            if(this.count(option) == count)
                same ++;
        });

        return same;
    }

    maxsame() {
        const map = {};
        this.#options.forEach(option =>{
            const count = this.count(option)
            map[count] = (map[count] || 0) + 1;
        });
        return Math.max(Object.values(map));
    }

    crank() {
        const m = {};
        this.#counter.forEach((count, option) => {
            if(m[count]) m[count].push(option);
            else m[count] = [option];
        });
        return Array
            .from(new Set(this.#counter.values()))
            .sort((a,b)=>b-a)
            .map(count => m[count]);
    }

}