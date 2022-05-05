import Client from "./client.js";

export default class Database {
    constructor({connection}) {
        this.#client = new Client(connection);
    }
    #client;

    async initialize() {
        await this.#client.connect();
    }
}