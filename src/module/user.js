import crypto from 'crypto';
import IModule from "./imodule.js";

export default class User extends IModule {

    #authenticated = new Map();
    #users = new Map();
    #counter = 46656;

    get authenticatedUUID() {
        return this.#authenticated.keys();
    }

    get authenticatedUsername() {
        return this.#authenticated.values();
    }

    get authenticatedEntries() {
        return this.#authenticated.entries();
    }

    isAuthenticated(uuid) {
        return this.#authenticated.has(uuid);
    }

    authenticate(uuid, username, password) {
        if(!this.#checkUsername(username)) return { r: false, e: $err.NO_USER };
        const user = $.dbModel('user').findUser(username);
        if(!user) return { r: false, e: $err.NO_USER };
        if(user.password !== this.passwordEncrypt(password)) return { r: false, e: $err.PASSWORD_ERROR };
        const lastUUid = this.#users.get(username);
        this.#authenticated.delete(lastUUid);
        this.#users.set(username, uuid);
        this.#authenticated.set(uuid, username);
        $.close(lastUUid, 3001, 'AAuth');
        return { r: true };
    }

    guest(uuid) {
        const guestNumber = `#guest#${(this.#counter++).toString(36)}`;
        this.#authenticated.set(uuid, guestNumber);
        this.#users.set(guestNumber, uuid);
        return { r: true };
    }

    register(uuid, username, password) {
        if(!this.#checkUsername(username)) return { r: false };
        const user = $.dbModel('user').findUser(username);
        if(user) return { r: false };
        $.dbModel('user').createUser(username, this.passwordEncrypt(password));
        this.#authenticated.set(uuid, username);
        this.#users.set(username, uuid);
        return { r: true };
    }

    logout(uuid) {
        const username = this.#authenticated.get(uuid);
        this.core.game.leave(uuid);
        this.#users.delete(username);
        this.#authenticated.delete(uuid);
        return { r: true };
    }

    #checkUsername(username) {
        if(typeof username !== 'string') return false;
        if(username[0]=='#') return false;
        if(username.length < 1) return false;
        return username.length <= 24;
    }

    username(uuid) {
        return this.#authenticated.get(uuid);
    }

    isGuest(uuid) {
        const id = this.#authenticated.get(uuid);
        if(!id) return true;
        return id[0]=='#';
    }

    #passwordEncrypt(password) {
        const sha256 = crypto.createHash('sha256').update(password).digest('hex');
        const md5 = crypto.createHash('md5').update(password).digest('hex');
        return crypto.createHash('sha256').update(sha256 + md5).digest('hex');
    }

}