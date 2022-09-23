import { clone, objDiff } from '../../functions/index.js';
export default class Base {
    /** @type {import('mongodb').CreateCollectionOptions} */
    static options;
    /** @type {import('mongodb').IndexDescription[]} */
    static indexes;

    /**
     * @param {import('mongodb').Collection} collection
     */
    constructor(collection) {
        this.#$ = new Proxy(collection, {
            get: (target, prop) => {
                if(prop in target) {
                    const v = target[prop];
                    if(v instanceof Function) return v.bind(target);
                    return v;
                }
            }
        });
    }

    /** @private */
    #$;
    /** @readonly */
    get $() { return this.#$; }

    /**
     * @param {any} obj
     * @param {number} [depth=Infinity]
     * @param {boolean} [flatArray=false]
     * @return {any}
     */
    $flat(obj, depth=Infinity, flatArray=false) {
        const flat = (o, d)=> {
            if( d <= 0
                || typeof o !== 'object'
                || Array.isArray(o) && !flatArray
            ) return [o, false];

            const r = {};
            for (const k in o) {
                const [v, n] = flat(o[k], d-1);
                if(!n) {
                    r[k] = v;
                    continue;
                }
                for(const s in v)
                    r[`${k}.${s}`] = v[s];
            }
            return [r, true];
        }
        return flat(obj, depth+1)[0];
    }

    #sync = new Map();
    $sync(uid, data, isSet=false) {
        if(isSet) {
            this.#sync.set(uid, data);
            return;
        }
        const last = this.#sync.get(uid);
        if(!last) {
            this.#sync.set(uid, [data]);
        } else {
            last[0] = data;
        }
    }

    sync(uid) {
        if(this.#sync.has(uid)) {
            const [data, last] = this.#sync.get(uid);
            if(!data) return null;
            const diff = objDiff(last, data);
            this.#sync.set(uid, [null,data]);
            return diff;
        }
        return null;
    }

    usync(uid) {
        this.#sync.delete(uid);
    }

    async gsync(uid, update) {
        const data = await this.$.findOne(
            {uid}, {projection: {_id: 0, password: 0}}
        );
        if(!data) return;
        if(data.updated>update) {
            this.$sync(uid, [data], true);
        } else {
            this.$sync(uid, [null, data], true);
        }
    }
}