globalThis.clone = function clone(value) {
    if(value === null) return null;
    if(typeof value === 'object') {
        if(Array.isArray(value)) return value.map(v=>clone(v));
        const newObj = {};
        for(const key in value) newObj[key] = clone(value[key]);
        return newObj;
    }
    return value;
}

globalThis.isFunction = function isFunction(value) {
    return typeof value=="function" && !!value.constructor;
}

globalThis.weightRandom = function weightRandom(list) {
    let totalWeights = 0;
    for(const [, weight] of list)
        totalWeights += weight;

    let random = Math.random() * totalWeights;
    for(const [id, weight] of list)
        if((random-=weight)<0)
            return id;
    return list[list.length-1];
}

globalThis.listRandom = function listRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

globalThis.sum = function sum(...arr) {
    let s = 0;
    arr.flat().forEach(v=>s+=v);
    return s;
}

globalThis.firstNotNull = function firstNotNull(...arr) {
    for(const v of arr.flat())
        if(v!=null)
            return v;
}

globalThis.__instance = new Map();
globalThis.instance = function instance(obj) {
    const i = globalThis.__instance;
    if(i.has(obj)) return i.get(obj);

    if(obj && obj.constructor) {
        const inst = new obj();
        i.set(obj, inst);
        return inst;
    }

    return null;
}

globalThis.delay = async function delay(min, max) {
    const time = max? Math.random() * (max - min) + min : min;
    await new Promise(resolve => setTimeout(resolve, time));
}

globalThis.batch = function batch(bpart, time, apart) {
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