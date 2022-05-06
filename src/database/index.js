import Client from "./client.js";
import * as Models from "./model/index.js";

export default class Database {
    constructor({connection}) {
        this.#client = new Client(connection);
    }
    #client;
    #models = new Map();

    async initialize() {
        await this.#client.connect();
        for(const Model of Object.values(Models)) {
            const model = new Model({client: this.#client});
            await model.initialize();
            this.#models.set(Model.model, model);
        }
    }

    model(model) {
        return this.#models.get(model);
    }

    get client() { return this.#client; }

}