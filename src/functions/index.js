export function clone(value) {
    if(value === null) return null;
    if(typeof value === 'object') {
        if(Array.isArray(value)) return value.map(v=>clone(v));
        if(value instanceof Map) {
            const map = new Map();
            value.forEach((v,k)=>map.set(k,clone(v)));
            return map;
        }
        if(value instanceof Set) {
            const set = new Set();
            value.forEach(v=>set.add(clone(v)));
            return set;
        }
        if(value instanceof Date) {
            return new Date(value);
        }
        const obj = {};
        for(const key in value) obj[key] = clone(value[key]);
        return obj;
    }
    return value;
}

export function isFunction(value) {
    return typeof value=="function" && !!value.constructor;
}

export function listRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

export async function delay(min, max) {
    const time = max? Math.random() * (max - min) + min : min;
    if(!time) return;
    await new Promise(resolve => setTimeout(resolve, time));
}

export function batch(bpart, time, apart) {
    let flag = false;
    const args = {};
    const fn = async ()=>{
        if(flag) return;
        flag = true;
        const ret = await apart?.(args);
        await delay(time);
        if(!flag) return;
        bpart(ret, args);
        flag = false;
    }
    Object.defineProperties(fn, {
        flag: { get: ()=>flag, set: f=>{flag=f}},
    });
    return fn;
}