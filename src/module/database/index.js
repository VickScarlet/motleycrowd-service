import IModule from '../imodule.js';
import mongoose from 'mongoose';
import KVData from './model/KVData.js';
import User from './model/User.js';
import Game from './model/Game.js';
import Score from './model/Score.js';

/**
 * 数据库模块
 * @class Database
 * @extends IModule
 */
export default class Database extends IModule {
    #kvdata;
    #user;
    #game;
    #score;
    get kvdata() { return this.#kvdata; }
    get user() { return this.#user; }
    get game() { return this.#game; }
    get score() { return this.#score; }

    async initialize() {
        const {host, port, dbName, username, password, model: mc} = this.$configure;
        await mongoose.connect(`mongodb://${host}:${port}`, {
            dbName, username, password,
        });

        const {Schema, model} = mongoose;
        this.#kvdata = new KVData(Schema, model, mc.KVData);
        this.#user = new User(Schema, model, mc.User);
        this.#game = new Game(Schema, model, mc.Game);
        this.#score = new Score(Schema, model, mc.Score);
    }

    async shutdown() {
        return mongoose.disconnect();
    }
}