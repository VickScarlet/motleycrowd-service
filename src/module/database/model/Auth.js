import Base from '../base.js';
import crypto from 'crypto';

/**
 * @typedef {Object} userdata
 * @property {string} uid
 * @property {string} username
 * @property {string} password
 * @property {string} email
 * @property {{}=} meta
 * @property {Date} created
 */
/** 用户数据模型 */
export default class Auth extends Base {
    static indexes = [
        { key: {uid: 1}, unique: true },
        { key: {username: 1}, unique: true },
        { key: {email: 1}, unique: true },
        { key: {password: 1} },
    ];

    /**
     * 认证
     * @async
     * @param {string} type
     * @param {string} value
     * @returns {Promise<string|null>}
     */
    async authenticate(username, password) {
        password = this.#encrypt(password);
        return this.$.findOne(
            { username, password },
            { projection: { _id: 0, uid: 1, banned: 1 } }
        );
    }

    /**
     * 创建用户
     * @async
     * @param {string} uid
     * @param {string} username
     * @param {string} password
     */
    async create(uid, username, password) {
        return this.$.insertOne({
            uid, username, email: uid,
            password: this.#encrypt(password),
        }).then(({acknowledged})=>acknowledged)
        .catch(()=>false);
    }

    /**
     * 更新用户数据
     * @param {string} uid
     * @param {Object<string, any>} update
     * @return {Promise<boolean>}
     */
     async #update(uid, update) {
        return this.$.updateOne(
            { uid }, { $set: update }
        ).then(({acknowledged})=>acknowledged)
        .catch(()=>false);
    }

    /**
     * 修改密码
     * @async
     * @param {string} uid
     * @param {string} password
     */
    async changePassword(uid, password) {
        return this.#update(uid, {
            password: this.#encrypt(password)
        });
    }

    /**
     * 修改用户名
     * @async
     * @param {string} uid
     * @param {string} username
     */
    async changeUsername(uid, username) {
        return this.#update(uid, {username});
    }

    /**
     * 修改邮箱
     * @async
     * @param {string} uid
     * @param {string} email
     */
    async changeEmail(uid, email) {
        return this.#update(uid, {email});
    }

    /**
     * 根据用户名查找用户
     * @async
     * @param {string} username
     */
    async findByUsername(username) {
        return this.$.findOne(
            { username },
            { projection: { _id: 0, password: 0 } }
        );
    }

    /**
     * 根据邮箱查找用户
     * @async
     * @param {string} email
     */
    async findByEmail(email) {
        return this.$.findOne(
            { email },
            { projection: { _id: 0, password: 0 } }
        );
    }

    /**
     * 密码加密
     * @private
     * @param {password} password
     */
    #encrypt(password) {
        const sha256 = crypto.createHash('sha256').update(password).digest('hex');
        const md5 = crypto.createHash('md5').update(password).digest('hex');
        return crypto.createHash('sha256').update(sha256 + md5).digest('hex');
    }


    /**
     * Ban
     * @async
     * @param {string} uid
     */
    async ban(uid) {
        return this.#update(uid, {banned: true});
    }

    /**
     * unBan
     * @async
     * @param {string} uid
     */
    async unban(uid) {
        return this.#update(uid, {banned: false});
    }
}