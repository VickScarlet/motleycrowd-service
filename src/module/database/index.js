import Client from "./client.js";
import * as Models from "./model/index.js";
import IModule from "../imodule.js";

export default class Database extends IModule {
    constructor(...args) {
        super(...args);
        this.#client = new Client(this.$configure.connection);
    }
    #client;
    #models = new Map();

    async initialize() {
        await this.#client.initialize();
        for(const Model of Object.values(Models)) {
            const model = new Model({client: this.#client});
            await model.initialize();
            this.#models.set(Model.model, model);
        }
    }

    model(model) {
        return this.#models.get(model);
    }

}