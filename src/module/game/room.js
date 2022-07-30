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
                this.#questions = $.randomQuestions(this.#users);
                this.#next();
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
        if(this.#questions.has(uuid) || question != this.#questions.id) return false;
        this.#questions.answer(uuid, answer);
        if(this.#questions.answerSize != this.#live.size) {
            $core.send(Array.from(this.#live), 'answer', this.#questions.answerSize);
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
            $core.send(Array.from(this.#live), 'question', question.id);
            return;
        }
        $core.send(Array.from(this.#live), 'question', question.id);
    }
}