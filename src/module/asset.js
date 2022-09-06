import IModule from "./imodule.js";

export default class Asset extends IModule {
    #group(rewards) {
        const group = new Group();
        for(const type in rewards) {
            const reward = rewards[type];
            switch(type) {
                case "rank":
                    group.push('rank', {
                        ranking: reward,
                    });
                    break;
                case "money":
                    group.push('asset', {
                        money: reward
                    });
                    break;
                default:
                    group.push('default', {
                        [type]: reward
                    });
            }
        }
        return group;
    }

    async #reward(uid, type, rewards) {
        switch(type) {
            case "asset":
                return this.$db.asset
                    .reward(uid, rewards);
            case "rank":
                return this.$rank
                    .reward(uid, rewards);
            default:
                return false;
        }
    }

    async reward(uid, rewards) {
        const result = await Promise.all(
            this.#group(rewards).map(
                (task, type)=>this.#reward(
                    uid, type, task.get()
                )
            )
        );
        for(const r of result)
            if(!r) return false;
        return true;
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