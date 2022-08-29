/**
 * @typedef {import('mongoose').Schema} Schema
 * @typedef {import('mongoose').model} model
 * @typedef {import('../index').ModelConfigure} configure
 */
/** 用户数据模型 */
export default class User {
    /**
     * @constructor
     * @param {Schema} Schema
     * @param {model} model
     * @param {configure} [configure={}]
     */
    constructor(Schema, model, {collection}={}) {
        this.#schema = new Schema({
            uid: {type: String, required: true, unique: true, index: true},
            username: {type: String, required: true, unique: true, index: true},
            password: {type: String, required: true},
            email: {type: String, unique: true, index: true},
            meta: {type: Object, default: {}},
            created: {type: Date, default: Date.now},
        });
        this.#model = model('User', this.#schema, collection);
    }
    /** @private @type {Schema} */
    #schema;
    /** @private @type {model} */
    #model;

    /**
     * 创建用户
     * @async
     * @param {string} uid
     * @param {string} username
     * @param {string} password
     */
    async create(uid, username, password) {
        const user = new this.#model({
            uid,
            username,
            password,
            email: uid
        });
        return user.save();
    }

    /**
     * 修改密码
     * @async
     * @param {string} uid
     * @param {string} password
     */
    async changePassword(uid, password) {
        const user = await this.find(uid);
        if (!user) return;
        user.password = password;
        return user.save();
    }

    /**
     * 修改用户名
     * @async
     * @param {string} uid
     * @param {string} username
     */
    async changeUsername(uid, username) {
        const user = await this.find(uid);
        if (!user) return;
        user.username = username;
        return user.save();
    }

    /**
     * 修改邮箱
     * @async
     * @param {string} uid
     * @param {string} email
     */
    async changeEmail(uid, email) {
        const user = await this.find(uid);
        if (!user) return;
        user.email = email;
        return user.save();
    }

    /**
     * 查找用户
     * @async
     * @param {string} uid
     */
    async find(uid) {
        return this.#model.findOne({uid});
    }

    /**
     * 根据用户名查找用户
     * @async
     * @param {string} username
     */
    async findUserByUsername(username) {
        return this.#model.findOne({username});
    }

    /**
     * 根据邮箱查找用户
     * @async
     * @param {string} email
     */
    async findUserByEmail(email) {
        return this.#model.findOne({email});
    }
}