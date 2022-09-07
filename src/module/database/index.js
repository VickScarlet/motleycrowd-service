/**
 * @typedef {{collection: string}} ModelConfigure
 * @typedef {{
 *      url: string,
 *      dbName: string,
 *      options?: import('mongodb').MongoClientOptions,
 *      model: {
 *          KVData: ModelConfigure,
 *          User: ModelConfigure,
 *          Game: ModelConfigure,
 *          Score: ModelConfigure,
 *          Asset: ModelConfigure,
 *      }
 * }} configure
 */
import IModule from '../imodule.js';
import {MongoClient} from 'mongodb';
import KVData from './model/KVData.js';
import User from './model/User.js';
import Game from './model/Game.js';
import Score from './model/Score.js';
import Asset from './model/Asset.js';

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
    /** @private @type {Asset} */
    #asset;
    /** @readonly */
    get kvdata() { return this.#kvdata; }
    /** @readonly */
    get user() { return this.#user; }
    /** @readonly */
    get game() { return this.#game; }
    /** @readonly */
    get score() { return this.#score; }
    /** @readonly */
    get asset() { return this.#asset; }

    /**
     * @private
     * @type {MongoClient}
     */
    #client;

    /** @override */
    async initialize() {
        /** @type {configure} */
        const {url, options, dbName, model: mc} = this.$configure;
        const client = new MongoClient(url, options);
        this.#client = client;
        await client.connect();
        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();
        const set = new Set(collections.map(({name}) => name));
        const create = async (Model, {collection})=>{
            let coll;
            if(!set.has(collection)) {
                const {options} = Model;
                coll = await db.createCollection(collection, options);
            } else {
                coll = db.collection(collection);
            }
            await coll.createIndexes(Model.indexes);
            return new Model(coll);
        };

        [
           this.#kvdata,
           this.#user,
           this.#game,
           this.#score,
           this.#asset,
        ] = await Promise.all([
            create(KVData, mc.KVData),
            create(User, mc.User),
            create(Game, mc.Game),
            create(Score, mc.Score),
            create(Asset, mc.Asset),
        ]);
    }

    /** @override */
    async shutdown() {
        if(this.#client) {
            await this.#client.close();
        }
    }

    sync(uid) {
        const sync = [
            ['user', this.#user.sync(uid)],
            ['asset', this.#asset.sync(uid)],
        ].filter(([,s])=>!!s);
        if(!sync.length) return null;
        return Object.fromEntries(sync);
    }

    usync(uid) {
        this.#user.usync(uid);
        this.#asset.usync(uid);
    }

    async gsync(uid, sync) {
        const update = type=>{
            if(!sync || !sync[type])
                return new Date(0);
            return new Date(sync[type]);
        }
        return Promise.all([
            this.#user.gsync(uid, update('user')),
            this.#asset.gsync(uid, update('asset')),
        ]);
    }
}