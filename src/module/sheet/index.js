import IModule from "../imodule.js";

const SHEETS = [ 'achievement', 'reward' ];
export default class Sheet extends IModule {
    /** @override */
    async initialize() {
        const { load, freeze } = this.$configure;
        this.#freeze = !!freeze;
        for(const name of SHEETS) {
            const sheet = await load(name);
            if(!sheet)
                throw new Error(`sheet [${name}] load failed!!`);
            if(freeze) Object.freeze(sheet);
            $l.sheet.debug(`sheet [${name}] loaded.`);
            this.#sheets[sheet] = sheet;
        }
    }

    #sheets = new Map();
    #freeze = false;

    #get(sheet, ...keys) {
        let data = this.#sheets.get(sheet);
        if(!data) {
            $l.sheet.warn(`sheet [${sheet}] not found.`);
            return null;
        }
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
        let data = this.#sheets.get(sheet);
        if(!data) {
            $l.sheet.warn(`sheet [${sheet}] not found.`);
            return null;
        }
        return Object.keys(data);
    }
}