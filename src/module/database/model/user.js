import IModel from './imodel.js';

export default class User extends IModel {
    static model = 'user';
    constructor({client}) {
        super({
            client,
            limit: -1,
            collection: 'user',
            key: 'username',
            // autoSave: 10000,
        });
    }


    findUser(username) { 
        return this.findCache(username);
    }

    createUser(username, password) {
        const data = { 
            username, 
            password,
            created: Date.now(),
            updated: Date.now(),
        };
        this.change(username, data);
    }
}