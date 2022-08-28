export function clone(value) {
    if(value === null) return null;
    if(typeof value === 'object') {
        if(Array.isArray(value)) return value.map(v=>clone(v));
        const newObj = {};
        for(const key in value) newObj[key] = clone(value[key]);
        return newObj;
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