/**
 * @typedef {string} qid
 * @typedef {number} pool
 * @typedef {undefined} configure
 * @typedef {Questions} Questions
 */
import IModule from '../imodule.js';
import {Question, Questions} from './subjects/index.js';

/** 题目模块 */
export default class QuestionHelper extends IModule {
    /**
     * 获取一个题目
     * @param {qid} qid
     * @param {string=} picked
     */
    get(qid, picked) {
        return Question.get(qid, picked);
    }

    /**
     * 池子里随机一套题目
     * @param {pool} pool
     */
    pool(pool) {
        return Questions.get(pool);
    }

    /**
     * 自己挑一套题目
     * @param {[qid: qid, picked?: string][]} questions
     */
    pick(questions) {
        return Questions.pick(questions);
    }

    /**
     * 池子里随机一套题目
     * @param {pool} pool
     */
    random(pool) {
        return this.pool(pool);
    }
}