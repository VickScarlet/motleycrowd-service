import {Question, Questions} from './question.js';

export default class QuestionHelper {
    constructor({questions}) {
        this.#data = questions;
    }

    #data;
    async initialize() {
        // empty
    }

    info(question) {
        const data = this.#data[question];
        if(!data) return null;
        return new Question(data);
    }

    randomQuestions(users) {
        const questions = ['q1001', 'q1002', 'q1003', 'q1004', 'q1005']
            .map(question => this.#data[question]);
        return new Questions({questions, users});
    }
}