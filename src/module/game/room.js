import { delay, batch } from '../../functions/index.js';
export default class Room {
    constructor(game, {limit, pool}) {
        this.#game = game;
        this.#limit = limit;
        this.#pool = pool;

        // join leave batch
        this.#jlBatch = batch(
            async last=>{
                const join = [];
                const leave = [];
                for(const uid of this.#users) {
                    if(last.has(uid)) continue;
                    join.push(uid);
                }
                for(const uid of last) {
                    if(this.#users.has(uid)) continue;
                    leave.push(uid);
                }

                if(!(join.length+leave.length)) return;

                this.#listSend('user', [
                    await this.#game.userdata(join),
                    leave
                ]);
            },
            this.#batchTick,
            ()=>new Set(this.#users),
        );

        // answer batch
        this.#answerBatch = batch(
            ()=>this.#listSend('answer', [
                this.#questions.idx,
                this.#questions.currentAnswerSize
            ]),
            this.#batchTick,
        )
    }

    #meta = {};
    #game;
    #limit;
    #pool;
    #startWait = 3000;
    #batchTick = 5000;
    #users = new Set();
    #live = new Set();
    #start = false;
    #questions = null;
    #jlBatch;
    #answerBatch;
    #timeout;
    #defaultTimeout = 60 * 1000;

    get meta() { return this.#meta; }
    get ready() {return this.#users.size == this.#limit;}
    get users() {return this.#users;}
    get live() {return this.#live;}
    get questions() { return this.#questions; }

    async #listSend(cmd, data, filter) {
        let uids = Array.from(this.#live);
        if(filter) uids = uids.filter(uid=>uid!=filter);
        return this.#game.listSend(uids, cmd, data);
    }

    async info() {
        return {
            users: await this.#game.userdata(this.#users),
            limit: this.#limit,
        };
    }

    join(uid) {
        if(this.ready) return false;
        this.#jlBatch();
        this.#users.add(uid);
        this.#live.add(uid);
        if(this.ready)
            (async ()=>{
                await this.#listSend('ready', this.#startWait);
                await delay(this.#startWait);
                if(!this.ready) {
                    await this.#listSend('pending', this.#users.size);
                    return;
                }
                this.#start = true;
                this.#questions = this.#game.randomQuestion(this.#pool);
                this.#next();
            })();
        return true;
    }

    leave(uid) {
        this.#live.delete(uid);
        if(this.#start) {
            this.#checktonext();
            return this.#live.size;
        }
        this.#jlBatch();
        this.#users.delete(uid);
        return this.#users.size;
    }

    answer(uid, answer, idx) {
        if(!this.#start) return false;
        if(this.#questions.has(uid)|| idx != this.#questions.idx)
            return false;
        if(!this.#questions.answer(uid, answer)) return false;
        this.#answerBatch();
        this.#checktonext();
        return true;

    }

    async #checktonext() {
        await delay(3000);
        if( !this.#questions
            || this.#questions.currentAnswerSize < this.#live.size
        ) return;
        this.#answerBatch.flag = false;
        this.#next();
    }

    #next() {
        if(this.#timeout) clearTimeout(this.#timeout);
        if(!this.#questions.next())
            return this.#settlement();

        const {idx, question: {
            id, picked, timeout
        }} = this.#questions;
        this.#listSend('question', [idx, id, picked]);
        this.#timeout = setTimeout(() => this.#next(), Number(timeout) || this.#defaultTimeout);
    }

    async #settlement() {
        const users = Array.from(this.#users);
        const {questions, scores} = this.#questions.settlement(users);
        await this.#listSend('settlement', {questions, scores});
        this.#game.settlement(this, questions, users, scores);
    }

    clear() {
        this.#jlBatch.flag = false;
        this.#answerBatch.flag = false;
        if(this.#timeout) clearTimeout(this.#timeout);
        // this.#users.clear();
        // this.#live.clear();
        // this.#questions = null;
        // this.#start = false;
        // this.#meta = {};
    }
}