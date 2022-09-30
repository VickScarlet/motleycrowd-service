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
import Auth from './model/Auth.js';
import User from './model/User.js';
import Game from './model/Game.js';
import Score from './model/Score.js';
import Asset from './model/Asset.js';
import Record from './model/Record.js';
import Achievement from './model/Achievement.js';

/**
 * 数据库模块
 * @extends IModule
 */
export default class Database extends IModule {
    /** @private @type {KVData} */
    #kvdata;
    /** @private @type {Auth} */
    #auth;
    /** @private @type {User} */
    #user;
    /** @private @type {Game} */
    #game;
    /** @private @type {Score} */
    #score;
    /** @private @type {Asset} */
    #asset;
    /** @private @type {Record} */
    #record;
    /** @private @type {Achievement} */
    #achievement;
    /** @readonly */
    get kvdata() { return this.#kvdata; }
    /** @readonly */
    get auth() { return this.#auth; }
    /** @readonly */
    get user() { return this.#user; }
    /** @readonly */
    get game() { return this.#game; }
    /** @readonly */
    get score() { return this.#score; }
    /** @readonly */
    get asset() { return this.#asset; }
    /** @readonly */
    get record() { return this.#record; }
    /** @readonly */
    get achievement() { return this.#achievement; }

    /**
     * @private
     * @type {MongoClient}
     */
    #client;

    #gsync;
    get $i() {
        return {
            gsync: this.#gsync,
        };
    }

    /** @override */
    async initialize() {
        const start = Date.now();
        this.$info('initializing...');
        /** @type {configure} */
        const {url, options, dbName, model: mc, gsync} = this.$configure;
        this.#gsync = gsync;
        const client = new MongoClient(url, options);
        this.#client = client;
        this.$info(`Connected to ${url}`, options);
        await client.connect();
        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();
        const set = new Set(collections.map(({name}) => name));
        const create = async (Model, {collection})=>{
            let coll;
            if(!set.has(collection)) {
                const {options} = Model;
                this.$info(`create collection [${collection}]`, options);
                coll = await db.createCollection(collection, options);
            } else {
                this.$info(`load collection [${collection}]`);
                coll = db.collection(collection);
            }
            this.$debug(`create indexes [${collection}]`, Model.indexes);
            await coll.createIndexes(Model.indexes);
            return new Model(coll);
        };

        [
           this.#kvdata,
           this.#auth,
           this.#user,
           this.#game,
           this.#score,
           this.#asset,
           this.#record,
           this.#achievement,
        ] = await Promise.all([
            create(KVData, mc.KVData),
            create(Auth, mc.Auth),
            create(User, mc.User),
            create(Game, mc.Game),
            create(Score, mc.Score),
            create(Asset, mc.Asset),
            create(Record, mc.Record),
            create(Achievement, mc.Achievement),
        ]);
        this.$info('initialized in', Date.now()-start, 'ms.');
    }

    /** @override */
    async shutdown() {
        this.$info('shutdowning...');
        if(this.#client)
            await this.#client.close();
        this.$info('shutdowned.');
    }

    get(model) {
        switch(model) {
            case 'kvdata': return this.#kvdata;
            case 'auth': return this.#auth;
            case 'user': return this.#user;
            case 'game': return this.#game;
            case 'score': return this.#score;
            case 'asset': return this.#asset;
            case 'record': return this.#record;
            case 'achievement': return this.#achievement;
            default: return null;
        }
    }

    sync(uid) {
        if(!uid || this.$user.isGuest(uid))
            return null;
        const sync = [];
        this.#gsync.forEach(model=>{
            const s = this.get(model)?.sync(uid);
            if(s) sync.push(model, s);
        });
        if(!sync.length) return null;
        return sync;
    }

    usync(uid) {
        if(!uid || this.$user.isGuest(uid))
            return null;
        this.#gsync.forEach(
            model=>this.get(model)
                      ?.usync(uid)
        );
    }

    async gsync(uid, sync) {
        const update = type=>{
            if(!sync || !sync[type])
                return new Date(0);
            return new Date(sync[type]);
        }
        return Promise.all(this.#gsync.map(
            model=>this.get(model)
                      ?.gsync(uid, update(model))
        ));
    }
}