export default class Room {
    constructor({limit, }) {
        this.#limit = limit;
    }

    #limit;
    #startWait = 3000;
    #users = new Set();
    #live = new Set();
    #start = false;
    #questions = [];
    #question = -1;
    #answers = [];
    #answer;

    get ready() {return this.#users.size == this.#limit;}

    get info() {
        return {
            users: Array.from(this.#users).map(uuid=>$core.user.username(uuid)),
            limit: this.#limit,
        };
    }

    join(uuid) {
        if(this.ready) return false;
        $core.send(Array.from(this.#live), 'join', $core.user.username(uuid));
        this.#users.add(uuid);
        this.#live.add(uuid);
        if(this.ready)
            setTimeout(()=>{
                if(!this.ready) return;
                this.#start = true;
                this.#questions = $.randomQuestions();
                this.#q();
            }, this.#startWait);

        return true;
    }

    leave(uuid) {
        this.#live.delete(uuid);
        $core.send(Array.from(this.#live), 'leave', $core.user.username(uuid));
        if(this.#live.size == 0) {
            // TODO: 没人了
        }
        if(this.#start) return this.#live.size;
        this.#users.delete(uuid);
        return this.#users.size;
    }

    answer(uuid, answer, question) {
        if(!this.#start) return false;
        if(this.#answer.has(uuid) || question != this.#questions[this.#question]) return false;
        this.#answer.set(uuid, answer);
        if(this.#answer.size == this.#live.size) {
            // TODO: 本题答题结束
            this.#q();
        }
        $core.send(Array.from(this.#live), 'answer', this.#answer.size);
        return true;
    }

    #q() {
        if(this.#answer) {
            this.#answers.push(this.#answer);
        }
        this.#answer = new Map();
        this.#question ++;
        if(this.#question == this.#questions.length) {
            // TODO: 完成
            return;
        }
        $core.send(Array.from(this.#live), 'question', this.#questions[this.#question]);
    }
}