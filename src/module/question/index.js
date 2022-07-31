import IModule from '../imodule.js';
import {Question, Questions} from './question.js';
import questionsData from '../../../data/questions.json' assert { type: 'json' };

export default class QuestionHelper extends IModule {

    #data;
    async initialize() {
        this.#data = questionsData;
    }

    info(question) {
        const data = this.#data[question];
        if(!data) return null;
        return new Question(data);
    }

    random(users) {
        const questions = ['q1001', 'q1002', 'q1003', 'q1004', 'q1005']
            .map(question => this.#data[question]);
        return new Questions({questions, users});
    }
}