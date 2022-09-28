/**
 * @typedef {{limit: number, pool: number}} configure
 */
export default class Room {
    /**
     * @typedef {import('.').uid} uid
     * @typedef {import('.').default} Game
     * @typedef {import('.').Questions} Questions
     */
    /**
     * @constructor
     * @param {Game} game
     * @param {configure} configure
     * @param {Questions} questions
     * @param {function} settlement
     * @returns {Room}
     */
    constructor(game, limit, questions, settlement) {
        this.#game = game;
        this.#limit = limit;
        this.#questions = questions;
        this.#settlement = settlement;
        // join leave batch
        this.#jlBatch = $utils.batch(
            last=>{
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

                this.#listSend('user', [join, leave]);
            },
            this.#batchTick,
            ()=>new Set(this.#users),
        );

        // answer batch
        this.#answerBatch = $utils.batch(
            ()=>{
                if(this.#questions.end) return;
                const {idx, question: {size}} = this.#questions;
                this.#listSend('answer', [idx, size])
            },
            this.#batchTick,
        )
    }

    /** @private 元数据 @type {object} */
    #meta = {};
    /** @private 父game对象 @type {Game} */
    #game;
    /** @private 人数限制 @type {number} */
    #limit;
    /** @private 开局等待 @type {number} */
    #startWait = 3000;
    /** @private 批量间隔 @type {number} */
    #batchTick = 5000;
    /** @private 开局用户集合 @type {Set<string>} */
    #users = new Set();
    /** @private 活跃用户集合 @type {Set<string>} */
    #live = new Set();
    /** @private 是否开始游戏 @type {boolean} */
    #start = false;
    /** @private @type {Questions} */
    #questions = null;
    /** @private 批量发送 加入/退出 人员信息 @type {function} */
    #jlBatch;
    /** @private 批量发送当前答题人数 @type {function} */
    #answerBatch;
    /** @private 每题超时句柄 @type {number} */
    #timeout;
    /** @private 获取剩余时间 @type {function} */
    #left = ()=>0;
    /** @private 默认超时时间 @type {number} */
    #defaultTimeout = 60 * 1000;
    /** @private 结算 @type {settlement} */
    #settlement;

    /** @readonly 元数据 */
    get meta() { return this.#meta; }
    /** @readonly 是否满员 @type {boolean} */
    get full() {return this.#users.size >= this.#limit;}
    /** @readonly 是否开始游戏 @type {boolean} */
    get start() {return this.#start; }
    /** @readonly 开局用户集合 @type {Set<string>} */
    get users() {return this.#users;}
    /** @readonly 活跃用户集合 @type {Set<string>} */
    get live() {return this.#live;}
    /** @readonly 题目集 @type {Questions} */
    get questions() { return this.#questions; }

    /**
     * 整列发送
     * @private
     * @param {string} cmd
     * @param {any} data
     * @param {string} filter uid
     * @returns {Promise<boolean>}
     */
    async #listSend(cmd, data, filter) {
        let uids = Array.from(this.#live);
        if(filter) uids = uids.filter(uid=>uid!=filter);
        return this.#game.listSend(uids, cmd, data);
    }

    /**
     * 获取基础信息
     * @returns {{users: uid[], limit: number}}
     */
    get info() {
        return {
            users: Array.from(this.#users),
            limit: this.#limit,
        };
    }

    /**
     * 加入房间
     * @param {string} uid
     * @returns {boolean}
     */
    join(uid) {
        if(this.full) return false;
        this.#jlBatch();
        this.#users.add(uid);
        this.#live.add(uid);
        if(this.full)
            (async ()=>{
                await this.#listSend('ready', this.#startWait);
                await $utils.delay(this.#startWait);
                if(!this.full) {
                    await this.#listSend('pending', this.#users.size);
                    return;
                }
                this.#start = true;
                this.#next();
            })();
        return true;
    }

    /**
     * 离开房间
     * @param {string} uid
     * @returns {number} 房间活跃人数
     */
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

    /**
     * 答题
     * @param {string} uid
     * @param {string} answer option
     * @param {number} i index
     * @returns {boolean}
     */
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

    /**
     * 检查能否下一题
     * @private
     * @returns {void}
     */
    #checktonext() {
        if(!this.#start) return;
        if(this.#questions.end) return;
        const q = this.#questions.question;
        if(q && q.size < this.#live.size) return;
        this.#answerBatch.flag = false;
        this.#next();
    }

    /**
     * 下一题
     * @private
     * @returns {void}
     */
    #next() {
        if(this.#timeout) clearTimeout(this.#timeout);
        if(!this.#questions.next())
            return this.#settlement();

        const {idx, question: {
            id, picked, timeout
        }} = this.#questions;
        const t = Number(timeout) || this.#defaultTimeout;
        this.#listSend('question', [idx, id, picked, t]);
        const start = Date.now();
        this.#left = ()=>start+t-Date.now();
        this.#timeout = setTimeout(() => this.#next(), t);
    }

    /**
     * 清理定时器
     * @returns {void}
     */
    clear() {
        this.#jlBatch.flag = false;
        this.#answerBatch.flag = false;
        if(this.#timeout) clearTimeout(this.#timeout);
    }

    /**
     * 恢复状态
     * @param {string} uid
     * @returns {{
     *      info,
     *      start: boolean,
     *      question: {
     *          idx: number,
     *          id: string,
     *          picked: string,
     *          left: number,
     *          size: number,
     *          answer: string | undefined
     *      } | undefined
     * }} 当前状态
     */
    resume(uid) {
        const {info, start} = this;
        if(!start) return {info, start};

        const {idx, question} = this.#questions;
        if(!question) return null;
        const {id, picked, size} = question;
        const answer = question.get(uid);
        const left = this.#left();
        return {
            info, start,
            question: {
                idx, id, picked, left, size, answer
            },
        };
    }
}