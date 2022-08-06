import Answer from "./answer.js";
import Score from "./score.js";

export class Question {
    constructor({id, question, options, judge, least}) {
        this.#id = id;
        this.#question = question;
        this.#options = options;
        this.#judge = judge;
        this.#least = Number(least) || 0;
        this.#answer = new Answer({options: Object.keys(options)});
    }

    #id;
    #question;
    #options;
    #judge;
    #least;

    #answer;

    get id() {return this.#id;}
    get question() {return this.#question;}
    get options() {return this.#options;}
    get judge() {return this.#judge;}
    get least() {return this.#least;}
    get counter() {return this.#answer.counter;}
    get size() {return this.#answer.size;}

    option(option) {
        return this.#options[option];
    }

    answer(uuid, answer) {
        return this.#answer.answer(uuid, answer);
    }

    judge(score, users) {
        if(!score) return;
        const answer = this.#answer;
        const scores = {};
        if(answer.size) eval(this.#judge);

        users.forEach(uuid=>{
            if(!answer.has(uuid))
                return score.change(uuid, this.#least);
            const addition = scores[answer.get(uuid)];
            if(!addition) return;
            if(addition.b)
                return score.buff(uuid, addition.b);
            score.change(uuid, addition.s);
        });
    }

    forEach(callback) {
        this.#answer.forEach((value, key)=>callback(value, key, this));
    }

    has(uuid) {
        return this.#answer.has(uuid);
    }

    get(uuid) {
        return this.#answer.get(uuid);
    }
}

export class Questions {
    constructor({questions, users}) {
        this.#questions = questions.map(data=>new Question(data));
        this.#score = new Score();
        this.#users = users;
    }

    #index = -1;
    #questions;
    #score;
    #users;
    #judged = new Set();

    next() {
        if(this.end) return null;
        this.#index++;
        return !this.end;
    }

    get score() {return this.#score;}
    get question() {return this.#questions[this.#index] || null;}
    get questions() {return this.#questions;}
    get size() {return this.#questions.length;}
    get end() {return this.#questions.length <= this.#index;}
    get id() {
        const question = this.question;
        if(!question) return
        if(!this.question) return;
        return question.id;
    }
    get answerSize() {
        const question = this.question;
        if(!question) return 0;
        return question.size;
    }

    index(index) {return this.#questions[index];}
    answer(uuid, answer) {
        const question = this.question;
        if(!question) return false;
        return question.answer(uuid, answer);
    }
    judge() {
        if(this.#judged.has(this.#index)) return;
        const question = this.question;
        if(!question) return;
        question.judge(this.#score, this.#users);
        this.#judged.add(this.#index);
    }
    has(uuid) {
        const question = this.question;
        if(!question) return false;
        return question.has(uuid);
    }
}