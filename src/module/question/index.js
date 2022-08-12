import IModule from '../imodule.js';
import {Question, Questions} from './question.js';
import {meta, pick} from './subjects/meta.js';

export default class QuestionHelper extends IModule {
    get(question, picked) {
        const data = meta(question);
        if(!data) return null;
        return new Question(data, picked);
    }

    random(tag) {
        const metas = pick(tag);
        if(!metas) return null;
        return new Questions({questions: metas});
    }
}