export default class Room {
    constructor(core, {limit, }) {
        this.$core = core;
        this.#limit = limit;
    }

    #limit;
    #startWait = 3000;
    #users = new Set();
    #live = new Set();
    #start = false;
    #questions = null;
    #timeout = null;

    get ready() {return this.#users.size == this.#limit;}

    #listSend(cmd, data, filter) {
        let uids = Array.from(this.#live);
        if(filter) uids = uids.filter(uid=>uid!=filter);
        this.$core.listSend(uids, cmd, data);
    }

    async info() {
        const users = await Promise.all(
            Array.from(this.#users)
                .map(uid=>this.$core.user.data(uid))
        );
        return {
            users,
            limit: this.#limit,
        };
    }

    join(uid) {
        if(this.ready) return false;
        this.#users.add(uid);
        this.#live.add(uid);
        if(this.ready)
            this.#timeout = setTimeout(()=>{
                this.#timeout = null;
                if(!this.ready) return;
                this.#start = true;
                this.#questions = this.$core.question.random(this.#users);
                this.#next();
            }, this.#startWait);
        this.#listSend('join', this.$core.user.data(uid), uid);
        return true;
    }

    leave(uid) {
        this.#live.delete(uid);
        this.#listSend('leave', uid, uid);
        if(this.#live.size == 0) {
            // TODO: 没人了
        }
        if(this.#start) return this.#live.size;
        this.#users.delete(uid);
        return this.#users.size;
    }

    answer(uid, answer, question) {
        if(!this.#start) return false;
        if(this.#questions.has(uid) || question != this.#questions.id) return false;
        this.#questions.answer(uid, answer);
        if(this.#questions.answerSize != this.#live.size) {
            this.#listSend('answer', this.#questions.answerSize);
            return true;
        }
        // TODO: 本题答题结束
        this.#questions.judge();
        this.#next();
        return true;
    }

    #next() {
        const question = this.#questions.next();
        if(!question) {
            // TODO: 完成
            // this.$core.send(Array.from(this.#live), 'question', question.id);
            return;
        }
        this.#listSend('question', question.id);
    }

    clear() {
        if(this.#timeout) {
            clearTimeout(this.#timeout);
            this.#timeout = null;
        }
        this.#users.clear();
        this.#live.clear();
        this.#questions = null;
        this.#start = false;
    }
}