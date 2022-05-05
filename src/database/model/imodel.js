export default class IModel {
    constructor() {}

    #client;
    #collection;
    #cache;

    async initialize({client, collection}) {
        this.#collection = collection;
    }

    get client() { return this.#client; }
    set client(client) { this.#client = client; }

}