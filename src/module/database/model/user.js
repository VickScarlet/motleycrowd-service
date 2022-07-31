/**
 * 用户数据模型
 * @class User
 */
export default class User {
    constructor(Schema, model, {collection}={}) {
        this.#schema = new Schema({
            uid: {type: String, required: true, unique: true, index: true},
            username: {type: String, required: true, unique: true, index: true},
            password: {type: String, required: true},
            email: {type: String, unique: true, index: true},
            meta: {
                grade: Number,
                rank:  Number,
            },
            created: { type: Date, default: Date.now },
        });
        this.#model = model('User', this.#schema, collection);
    }
    #schema;
    #model;

    async create(uid, username, password) {
        const user = new this.#model({
            uid,
            username,
            password,
            email: uid
        });
        return user.save();
    }

    async changePassword(uid, password) {
        const user = await this.find(uid);
        if (!user) return;
        user.password = password;
        return user.save();
    }

    async changeUsername(uid, username) {
        const user = await this.find(uid);
        if (!user) return;
        user.username = username;
        return user.save();
    }

    async changeEmail(uid, email) {
        const user = await this.find(uid);
        if (!user) return;
        user.email = email;
        return user.save();
    }

    async find(uid) {
        return this.#model.findOne({uid});
    }

    async findUserByUsername(username) {
        return this.#model.findOne({username});
    }

    async findUserByEmail(email) {
        return this.#model.findOne({email});
    }
}