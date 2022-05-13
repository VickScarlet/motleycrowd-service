export default class User {

    #authenticated = new Map();

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
        if(!this.#checkUsername(username)) return { r: false };
        const user = $.dbModel('user').findUser(username);
        if(!user) return { r: false };
        if(user.password !== $.passwordEncrypt(password)) return { r: false };
        this.#authenticated.set(uuid, username);
        return { r: true };
    }

    register(uuid, username, password) {
        if(!this.#checkUsername(username)) return { r: false };
        const user = $.dbModel('user').findUser(username);
        if(user) return { r: false };
        $.dbModel('user').createUser(username, $.passwordEncrypt(password));
        this.#authenticated.set(uuid, username);
        return { r: true };
    }

    logout(uuid) {
        this.#authenticated.delete(uuid);
    }

    #checkUsername(username) {
        if(typeof username !== 'string') return false;
        if(username.length < 1) return false;
        if(username.length > 24) return false;
        return true;
    }

}