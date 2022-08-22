import crypto from 'crypto';
import IModule from "./imodule.js";

/**
 * 用户模块
 * @class User
 * @extends IModule
 */
export default class User extends IModule {

    #authenticated = new Map();
    #users = new Map();
    #counter = 46656;
    #registerCount = 0;
    #lock = new Set();

    get registerCount() {
        return this.#registerCount;
    }

    async initialize() {
        this.#registerCount = await this.$core.database.kvdata.get('register') || 0;
        this.$core.proxy('user', {
            register: (sid, {username, password}) => this.register(sid, username, password),
            authenticate: (sid, {username, password}) => this.authenticate(sid, username, password),
            guest: sid => this.guest(sid),
            logout: sid => this.logout(sid),
        }, true);
    }

    isAuthenticated(sid) {
        return this.#authenticated.has(sid);
    }

    async authenticate(sid, username, password) {
        // check username
        if(!this.#checkUsername(username)) return [this.$err.NO_USER];

        // AUTH LIMIT
        if(this.#lock.has(sid) || this.#lock.has(username))
            return [this.$err.AUTH_LIMIT];
        this.#lock.add(sid);
        this.#lock.add(username);
        setTimeout(() => {
            this.#lock.delete(sid);
            this.#lock.delete(username);
        }, this.$configure.authLimit);
        // AUTH LIMIT

        // query db
        const model = await this.$core.database.user.findUserByUsername(username);
        // not found
        if(!model) return [this.$err.NO_USER];
        // founded
        const {uid} = model;
        // check password
        if(model.password !== this.#passwordEncrypt(password)) return [this.$err.PASSWORD_ERROR];
        // last session
        const lastSid = this.#users.get(uid);
        // kick last session
        this.$core.session.close(lastSid, 3001, 'AAuth');
        this.#authenticated.delete(lastSid);
        // record this session
        this.#users.set(uid, {sid, model});
        this.#authenticated.set(sid, uid);
        this.#lock.delete(username);
        return [0, {uid}];
    }

    guest(sid) {
        const guestNumber = `#${(this.#counter++).toString(36)}`;
        this.#authenticated.set(sid, guestNumber);
        this.#users.set(guestNumber, {sid, g: true});
        return [0, {uid: guestNumber}];
    }

    async register(sid, username, password) {
        // check username
        if(!this.#checkUsername(username)) return [1];

        // AUTH LIMIT
        if(this.#lock.has(sid)) return [this.$err.AUTH_LIMIT];
        this.#lock.add(sid);
        setTimeout(() => this.#lock.delete(sid), this.$configure.authLimit);
        // AUTH LIMIT

        // check exist
        if(await this.$core.database.user.findUserByUsername(username))
            return [1];

        // register
        const uid = (46656 + ++this.#registerCount).toString(36); // uid by register count
        await this.$core.database.kvdata.set('register', this.#registerCount);
        const model = await this.$core.database.user.create(uid, username, this.#passwordEncrypt(password));

        // record this session
        this.#authenticated.set(sid, uid);
        this.#users.set(uid, {sid, model});
        return [0, {uid}];
    }

    leave(sid) {
        return this.logout(sid);
    }

    logout(sid) {
        const uid = this.#authenticated.get(sid);
        if(uid) {
            this.$core.game.leave(uid);
            this.#users.delete(uid);
            this.#authenticated.delete(sid);
        }
        return [0];
    }

    #checkUsername(username) {
        if(typeof username !== 'string') return false;
        if(username.length < 1) return false;
        return username.length <= 24;
    }

    uid(sid) {
        return this.#authenticated.get(sid);
    }

    sid(uid) {
        return this.#users.get(uid)?.sid;
    }

    async data(uid) {
        if(this.isGuest(uid)) return {uid, guest: true};
        const model = this.model(uid);
        if(!model) return null;
        return model.toJSON();
    }

    async model(uid) {
        if (this.#users.has(uid))
            return this.#users.get(uid).model;
        return this.$core.database.user.find(uid);
    }

    isGuest(uid) {
        return uid[0] == '#';
    }

    #passwordEncrypt(password) {
        const sha256 = crypto.createHash('sha256').update(password).digest('hex');
        const md5 = crypto.createHash('md5').update(password).digest('hex');
        return crypto.createHash('sha256').update(sha256 + md5).digest('hex');
    }

}