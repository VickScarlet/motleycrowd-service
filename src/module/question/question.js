import Answer from "./answer.js";
import Score from "./score.js";

export class Question {
    constructor({id, question, options, judge, least}, picket) {
        this.#id = id;
        this.#question = question;
        this.#options = options;
        this.#judge = judge;
        this.#least = Number(least) || 0;
        this.optionPick(picket);
    }

    #id;
    #question;
    #options;
    #picked;
    #judge;
    #least;

    #answer;

    get id() {return this.#id;}
    get question() {return this.#question;}
    get options() {return this.#options;}
    get least() {return this.#least;}
    get counter() {return this.#answer.counter;}
    get size() {return this.#answer.size;}
    get judge() {return this.#judge;}
    get answers() {return this.#answer;}
    get picked() {return [...this.#picked].sort().join('');}
    set picked(picked) {
        this.#picked = new Set(picked.split(''));
        this.#answer = new Answer({options: this.#picked});
    }

    optionPick(pickedMark) {
        if(pickedMark) {
            this.picked = pickedMark;
            return;
        }
        const picked = new Set();
        for(const option in this.#options) {
            const {type, rate} = this.#options[option];
            if(type == 'usually') {
                picked.add(option);
                continue;
            }
            if(Math.random()*10000<rate) {
                picked.add(option);
            }
        }

        this.#picked = picked;
        this.#answer = new Answer({options: picked});
    }

    option(option) {
        return this.#options[option];
    }

    answer(uuid, answer) {
        return this.#answer.answer(uuid, answer);
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
    constructor({questions}) {
        this.#questions = questions.map(data=>new Question(data));
    }

    #index = -1;
    #questions;

    next() {
        if(this.end) return null;
        this.#index++;
        return !this.end;
    }

    get questions() {return this.#questions;}
    get size() {return this.#questions.length;}
    get end() {return this.#questions.length <= this.#index;}
    get idx() {return this.#index;}
    get answers() {return this.#questions.map(q=>q.answers);}

    get question() {return this.#questions[this.#index] || null;}
    get currentId() {
        const question = this.question;
        if(!question) return
        if(!this.question) return;
        return question.id;
    }
    get currentAnswerSize() {
        const question = this.question;
        if(!question) return 0;
        return question.size;
    }

    #judgeList() {
        return this.#questions;
    }

    settlement(users) {
        const questions = [];
        const score = new Score(users);
        const answers = {};

        for(const {
            id, picked, least,
            answers: answer, judge,
        } of this.#judgeList()) {
            questions.push([id, picked]);

            const scores = judge({score, answer, picked});
            users.forEach(uuid=>{
                const data = answers[uuid] || [];
                if(!answers[uuid]) answers[uuid] = data;
                if(!answer.has(uuid))
                    return data.push(
                        score.addition(uuid, least)
                    );

                const ans = answer.get(uuid);
                data.push([
                    score.addition(uuid, scores[ans]),
                    ans
                ]);
            });
        }

        const usersScores = {};
        for(const uuid of users)
            usersScores[uuid] = [
                score.get(uuid),
                answers[uuid],
            ];

        return {
            questions,
            scores: usersScores,
        }
    }

    index(index) {return this.#questions[index];}
    answer(uuid, answer) {
        const question = this.question;
        if(!question) return false;
        return question.answer(uuid, answer);
    }
    has(uuid) {
        const question = this.question;
        if(!question) return false;
        return question.has(uuid);
    }
}