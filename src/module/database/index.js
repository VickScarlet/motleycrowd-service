/**
 * @typedef {import('./base').configure} ModelConfigure
 * @typedef {{
 *      host: string,
 *      port: number,
 *      dbName: string,
 *      username?: string,
 *      password?: string,
 *      model: {
 *          KVData?: ModelConfigure,
 *          User?: ModelConfigure,
 *          Game?: ModelConfigure,
 *          Score?: ModelConfigure,
 *      }
 * }} configure
 */
import IModule from '../imodule.js';
import mongoose from 'mongoose';
import KVData from './model/KVData.js';
import User from './model/User.js';
import Game from './model/Game.js';
import Score from './model/Score.js';

/**
 * 数据库模块
 * @extends IModule
 */
export default class Database extends IModule {
    /** @private @type {KVData} */
    #kvdata;
    /** @private @type {User} */
    #user;
    /** @private @type {Game} */
    #game;
    /** @private @type {Score} */
    #score;
    /** @readonly */
    get kvdata() { return this.#kvdata; }
    /** @readonly */
    get user() { return this.#user; }
    /** @readonly */
    get game() { return this.#game; }
    /** @readonly */
    get score() { return this.#score; }

    /** @override */
    async initialize() {
        /** @type {configure} */
        const {host, port, dbName, username, password, model: mc} = this.$configure;
        await mongoose.connect(`mongodb://${host}:${port}`, {
            useNewUrlParser: true,
            dbName, username, password,
        });
        this.#kvdata = new KVData(mc.KVData);
        this.#user = new User(mc.User);
        this.#game = new Game(mc.Game);
        this.#score = new Score(mc.Score);
    }

    /** @override */
    async shutdown() {
        return mongoose.disconnect();
    }
}