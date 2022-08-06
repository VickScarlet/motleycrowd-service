import IModule from '../imodule.js';
import {Question, Questions} from './question.js';
import meta from './subjects/meta.js';

export default class QuestionHelper extends IModule {
    get(question) {
        const data = meta[question];
        if(!data) return null;
        return new Question(data);
    }

    random(users) {
        const questions = ['q1001', 'q1002', 'q1003', 'q1004', 'q1005']
            .map(question => meta[question]);
        return new Questions({questions, users});
    }
}