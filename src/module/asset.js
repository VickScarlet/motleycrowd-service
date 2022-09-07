import IModule from "./imodule.js";

export default class Asset extends IModule {
    #group(assets) {
        const group = new Group();
        for(const type in assets) {
            const asset = assets[type];
            switch(type) {
                case "rank":
                    group.push('rank', {
                        ranking: asset,
                    });
                    break;
                case "money":
                    group.push('asset', {
                        money: asset
                    });
                    break;
                default:
                    group.push('default', {
                        [type]: asset
                    });
            }
        }
        return group;
    }

    async #run(assets, run, isPipe=false) {
        const group = this.#group(assets);
        if(isPipe) {
            for(const [type, task] of group.entries())
                if(!await run(type, task.get()))
                    return false;
            return true;
        }

        const result = await Promise.all(
            group.map((task, type)=>run(type, task.get()))
        );
        for(const r of result)
            if(!r) return false;
        return true;
    }


    async #reward(uid, type, assets) {
        switch(type) {
            case "asset":
                return this.$db.asset
                    .reward(uid, assets);
            case "rank":
                return this.$rank
                    .reward(uid, assets);
            default:
                return false;
        }
    }

    async reward(uid, assets) {
        return this.#run(
            assets,
            this.#reward.bind(this, uid),
        );
    }

    async #check(uid, type, assets) {
        switch(type) {
            case "asset":
                return this.$db.asset
                    .check(uid, assets);
            default:
                return false;
        }
    }

    async check(uid, assets) {
        return this.#run(
            assets,
            this.#check.bind(this, uid),
            true
        );
    }

    async #consume(uid, type, assets) {
        switch(type) {
            case "asset":
                return this.$db.asset
                    .consume(uid, assets);
            default:
                return false;
        }
    }

    async consume(uid, assets) {
        return this.#run(
            assets,
            this.#consume.bind(this, uid),
            true
        );
    }

    async consumeWithCheck(uid, assets) {
        if(!await this.check(uid, assets))
            return false;
        return this.consume(uid, assets);
    }
}

class Group {
    #tasks = new Map();

    entries() {
        return this.#tasks.entries();
    }

    push(type, task) {
        if(this.#tasks.has(type))
            this.#tasks.get(type).push(task);
        else
            this.#tasks.set(type, new Task(task));
    }

    forEach(callback) {
        this.#tasks.forEach(callback);
    }

    map(callback) {
        const results = [];
        this.forEach((...args)=>{
            results.push(callback(...args));
        });
        return results;
    }

    get(type) {
        return this.#tasks.get(type);
    }
}

class Task {
    constructor(task) {
        this.push(task)
    }

    #task = {};

    get task() { return this.#task; }

    push(task={}) {
        Object.assign(this.#task, task);
    }

    get() {
        return this.#task;
    }
}