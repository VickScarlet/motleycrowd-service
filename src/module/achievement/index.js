import IModule from "../imodule.js";
import Settlement from "./settlement.js";

export default class Achievement extends IModule {

    proxy() {
        return {
            trigger: {
                ps: [
                    {key: 'achv', type: 'string', def: null},
                    {key: 'params', def: {}},
                ],
                do: (uid, achv, params) => this.trigger(uid, achv, params)
            },
        };
    }

    async trigger(uid, achv, params) {
        if(await this.$db.achievement.isUnlock(uid, achv))
            return [this.$err.ACHV_UNLOCKED];
        const sheet = this.$sheet.get('achievement', achv);
        if(!sheet) return [this.$err.PARAM_ERROR];
        const {condition, reward} = sheet;
        if(!await this.#check(uid, condition, params))
            return [this.$err.PARAM_ERROR];
        if(!await this.$db.achievement.unlock(uid, achv))
            return [this.$err.DATABASE_ERROR];
        await this.$asset.reward(uid, reward);
        return [0];
    }

    async #check(uid, condition, params) {
        const [success, values] =
            await this.#gets(uid, condition.values, params);
        if(!success) return false;
        return $logic.exec(condition.checks, values);
    }

    async #gets(uid, values, params) {
        const types = new Map();
        for(const key in values) {
            const [type, ...args] = values[key].split('.');
            if(!types.has(type)) types.set(type, []);
            types.get(type).push([key, args]);
        }
        const result = {};
        for(const [type, gets] of types) {
            const [success, get] = await this.#prepare(type, uid, params);
            if(!success) return [false];
            for(const [key, args] of gets) {
                result[key] = get(...args);
            }
        }
        return [true, result];
    }

    async #prepare(type, uid, params) {
        let t, get;
        switch(type) {
            case 'settlement':
                if(!params?.settlement) return [false];
                t = await this.$db
                    .game.get(params.settlement);
                if(!t) return [false];
                t = new Settlement(t, uid);
                get = (...args)=>t.get(...args);
                break;
            case 'record':
                t = await this.$db.record.gets(uid);
                get = (...args)=>this.#deep(t, ...args);
                break;
            case 'rank':
                t = this.$rank.user(uid);
                if (t) {
                    t = t[0];
                    const data = {};
                    for(const rank of t) {
                        const [ranking, size] = t[rank];
                        data[rank] = {ranking, size};
                    }
                    t = data;
                }
                get = (...args)=>this.#deep(t, ...args);
                break;
            default: return [false];
        }
        return [true, get];
    }

    #deep(prepare, ...args) {
        let data = prepare;
        for(const arg of args) {
            if(!data) return null;
            data = data[arg];
        }
        return data;
    }
}
