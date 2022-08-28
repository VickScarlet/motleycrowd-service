import { delay, batch } from '../../functions/index.js';
export default class Room {
    constructor(game, {limit, pool}) {
        this.#game = game;
        this.#limit = limit;
        this.#questions = this.#game.randomQuestion(pool);
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
            ()=>{
                if(this.#questions.end) return;
                const {idx, question: {size}} = this.#questions;
                this.#listSend('answer', [idx, size])
            },
            this.#batchTick,
        )
    }

    #meta = {};
    #game;
    #limit;
    #startWait = 3000;
    #batchTick = 5000;
    #users = new Set();
    #live = new Set();
    #start = false;
    #questions = null;
    #jlBatch;
    #answerBatch;
    #timeout;
    #left = ()=>0;
    #defaultTimeout = 60 * 1000;

    get meta() { return this.#meta; }
    get full() {return this.#users.size >= this.#limit;}
    get start() {return this.#start; }
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
        if(this.full) return false;
        this.#jlBatch();
        this.#users.add(uid);
        this.#live.add(uid);
        if(this.full)
            (async ()=>{
                await this.#listSend('ready', this.#startWait);
                await delay(this.#startWait);
                if(!this.full) {
                    await this.#listSend('pending', this.#users.size);
                    return;
                }
                this.#start = true;
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

    answer(uid, answer, i) {
        if(!this.#start) return false;
        const {idx, question} = this.#questions;
        if(question.has(uid)|| idx != i)
            return false;
        if(!question.answer(uid, answer)) return false;
        this.#answerBatch();
        this.#checktonext();
        return true;
    }

    #checktonext() {
        const {question} = this.#questions;
        if(!question || question.size < this.#live.size) return;
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
        const start = Date.now();
        const t = Number(timeout) || this.#defaultTimeout;
        this.#left = ()=>start+t-Date.now();
        this.#timeout = setTimeout(() => this.#next(), t);
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
    }

    async resume(uid) {
        const info = await this.info();
        const start = this.#start;
        if(!start) return {info, start};

        const {idx, question} = this.#questions;
        if(!question) return null;
        const {id, picked, size} = question;
        const answer = question.get(uid);
        const left = this.#left();
        return { info, start,
            question: {idx, id, picked, left, size, answer},
        };

    }
}