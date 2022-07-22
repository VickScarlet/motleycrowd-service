export default class IModel {
    constructor({client, limit, collection, key, autoSave = 600000}) {
        this.#client = client;
        this.#limit = limit;
        this.#collection = collection;
        this.#key = key;
        this.#autoSave = autoSave;
        this.#cacheMap = new Map();
        this.#change = new Set();
    };

    #client;
    #limit;
    #collection;
    #key;
    #cacheMap;
    #change;
    #autoSave;
    #interval;

    async initialize() {
        await this.#client.createIndex(this.#collection, [this.#key]);
        if(this.#limit == -1) await this.#fullCache();
        this.#interval = setInterval(() => this.save(), this.#autoSave);
    }

    get client() { return this.#client; }
    set client(client) { this.#client = client; }

    async #fullCache() { 
        const data = await this.#client.findAll(this.#collection, {});
        for(const item of data) {
            const key = item[this.#key];
            this.#cacheMap.set(key, item);
        }
    }

    change(key, data) {
        this.#change.add(key);
        this.#cacheMap.set(key, data);
    }

    has(key) {
        return this.#cacheMap.has(key);
    }

    findCache(key) {
        if(this.has(key))
            return clone(this.#cacheMap.get(key));
        return null;
    }

    async find(key) {
        if(this.has(key)) 
            return clone(this.#cacheMap.get(key));
        const data = await this.#client.findOne({[this.#key]: key});
        if(data) this.#cacheMap.set(key, data);
        return data || null;
    }

    async save() { 
        await Promise.all(
            Array.from(this.#change)
            .map(
                key => this.#client.update(
                    this.#collection, 
                    {[this.#key]: key}, 
                    this.#cacheMap.get(key)
                )
            )
        );
        this.#change.clear();
    }

    async destroy() {
        clearInterval(this.#interval);
        await this.save();
        this.#client = null;
        this.#cacheMap.clear();
        this.#change.clear();
    }

}