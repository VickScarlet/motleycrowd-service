import IModule from '../imodule.js';
import {Question, Questions} from './subjects/index.js';
export default class QuestionHelper extends IModule {
    get(qid, picked) {
        return Question.get(qid, picked);
    }

    pool(pool) {
        return Questions.get(pool);
    }

    pick(questions) {
        return Questions.pick(questions);
    }

    random(tag) {
        return this.pool(tag);
    }
}