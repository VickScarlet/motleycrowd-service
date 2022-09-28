import IModule from "../imodule.js";

export default class Sheet extends IModule {
    /** @override */
    async initialize() {
        const { sheets, freeze } = this.$configure;
        this.#sheets = sheets;
        if(freeze) {
            this.#freeze = true;
            Object.freeze(this.#sheets);
        }
    }

    #sheets;
    #freeze = false;

    #get(sheet, ...keys) {
        let data = this.#sheets[sheet];
        for (const key of keys) {
            if (!data) return null;
            data = data[key];
        }
        return data;
    }

    get(sheet, ...keys) {
        const data = this.#get(sheet, ...keys);
        return this.#freeze? data: $utils.clone(data);
    }

    keys(sheet) {
        return Object.keys(this.#get(sheet));
    }
}