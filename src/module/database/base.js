export default class Base {
    constructor(collection) {
        return new Proxy(this, {
            get: (target, prop) => {
                if(prop in target) return target[prop];
                if(prop in collection) {
                    const v = collection[prop];
                    if(v instanceof Function) return v.bind(collection);
                    return v;
                }
            }
        });
    }

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
}