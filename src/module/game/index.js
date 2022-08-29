/**
 * @typedef {import('../user').uid} uid
 * @typedef {import('../question/index').Questions} Questions
 * @typedef {import('./index').CommandResult} CommandResult
 * @typedef {import('./room').configure} RoomConfigure
 * @typedef {import('../database/model/Game').questions} questions
 * @typedef {import('../database/model/Game').scores} scores
 * @typedef {{types: {[type: number]: RoomConfigure}}} configure
 */
import IModule from "../imodule.js";
import Room from "./room.js";

export default class Game extends IModule {
    /** @private 类型配置 @type {{[type: number]: RoomConfigure}} */
    #types;
    /** @private 私人房间 @type {Map<string, Room>} */
    #privates = new Map();
    /** @private 匹配房间 @type {Set<Room>} */
    #pairs = new Set();
    /** @private 等待中 @type {Map<number, Room[]>} */
    #pairPending = new Map();
    /** @private 用户房间索引 @type {Map<uid, Room[]>} */
    #userRoom = new Map();

    /** @readonly 游戏模块状态 */
    get state() {
        const pending = {};
        for(const type in this.#types)
            pending[type] = this.#pairPending.get(type).length;
        return {
            users: this.#userRoom.size,
            privates: this.#privates.size,
            pairs: this.#pairs.size,
            pending,
        }
    }


    /**
     * @override
     * @returns {Promise<void>}
     */
    async initialize() {
        /** @type {configure} */
        const {types} = this.$configure;
        this.#types = types;
        for (const type in types) {
            this.#pairPending.set(type, []);
        }
        this.$core.proxy('game', {
            create: (uid, {type}) => this.create(uid, type),
            join: (uid, {room}) => this.join(uid, room),
            pair: (uid, {type}) => this.pair(uid, type),
            leave: uid => this.leave(uid),
            answer: (uid, [idx, answer]) => this.answer(uid, answer, idx),
        });
        this.$on('user.leave', uid => this.leave(uid));
        this.$on('user.authenticated', uid => this.#resume(uid));
        this.$on('user.pending', uid => this.#pending(uid));
    }

    /**
     * 用户离开
     * @private
     * @param {uid} uid
     */
    #leave(uid) {
        if(!this.#userRoom.has(uid)) return;
        /** @type {Room} */
        const room = this.#userRoom.get(uid);
        this.#userRoom.delete(uid);
        if(!room.leave(uid)) {
            this.#clear(room);
        } else if(!room.start) {
            const pending = this.#pairPending.get(room.meta.type);
            if(pending.includes(room)) return;
            pending.unshift(room);
        }
    }

    /**
     * 用户恢复
     * @private
     * @async
     * @param {uid} uid
     */
    async #resume(uid) {
        if(!this.#userRoom.has(uid)) return;
        /** @type {Room} */
        const room = this.#userRoom.get(uid);
        const data = await room.resume(uid);
        if(!data) {
            this.#leave(uid);
            return;
        }
        this.$core.send(uid, `game.resume`, data);
    }

    /**
     * 用户挂起
     * @private
     * @param {uid} uid
     */
    #pending(uid) {
        /** @type {Room} */
        const room = this.#userRoom.get(uid);
        if(!room || room.start) return;
        this.#leave(uid);
    }

    /**
     * 加入房间
     * @async
     * @param {uid} uid
     * @param {uid} roomId
     * @returns {CommandResult|Promise<CommandResult>}
     */
    async join(uid, roomId) {
        if(!this.#privates.has(roomId)) return [1];
        /** @type {Room} */
        const room = this.#privates.get(roomId);
        room.join(uid);
        this.#userRoom.set(uid, room);
        const info = await room.info();
        return [0, info];
    }

    /**
     * 匹配房间
     * @async
     * @param {uid} uid
     * @param {number} type
     * @returns {CommandResult|Promise<CommandResult>}
     */
    async pair(uid, type) {
        type = type&&''+type;
        if(this.#userRoom.has(uid)) return [this.$err.GAME_IN_ROOM];
        if(!this.#types.propertyIsEnumerable(type)) return [this.$err.NO_GAME_TYPE];
        const pending = this.#pairPending.get(type);
        /** @type {Room} */
        let room;
        if(pending.length > 0) {
            room = pending[0];
            if(room.start || room.full) {
                pending.shift();
                room = null;
            }
        }
        if(!room) {
            room = this.#newRoom(type, { private: false });
            this.#pairs.add(room);
            pending.push(room);
        }

        room.join(uid);
        this.#userRoom.set(uid, room);

        if(room.full) {
            pending.shift();
        }

        const info = await room.info();
        return [0, info];
    }

    /**
     * 离开房间
     * @async
     * @param {uid} uid
     * @returns {CommandResult|Promise<CommandResult>}
     */
    async leave(uid) {
        this.#leave(uid);
        return [0];
    }

    /**
     * 创建房间
     * @async
     * @param {uid} uid
     * @param {number} type
     * @returns {CommandResult|Promise<CommandResult>}
     */
    async create(uid, type) {
        type = type&&''+type;
        if(this.#userRoom.has(uid)) return [this.$err.GAME_IN_ROOM];
        if(!this.#types.propertyIsEnumerable(type)) return [this.$err.NO_GAME_TYPE];
        const roomId = this.#roomId();
        /** @type {Room} */
        const room = this.#newRoom(type, {
            private: true,
            id: roomId,
        });
        this.#privates.set(roomId, room);
        this.#userRoom.set(uid, room);
        room.join(uid);

        const info = await room.info();
        return [0, {room: roomId, info}];
    }

    /**
     * 回答问题
     * @async
     * @param {uid} uid
     * @param {string} answer
     * @param {number} idx
     * @returns {CommandResult|Promise<CommandResult>}
     */
    async answer(uid, answer, idx) {
        if(!this.#userRoom.has(uid)) return [1];
        /** @type {Room} */
        const room = this.#userRoom.get(uid);
        const result = room.answer(uid, answer, idx);
        return [result?0:1];
    }

    /**
     * 创建房间
     * @private
     * @param {string} type
     * @param {object} metas
     * @returns {Room}
     */
    #newRoom(type, metas) {
        const room = new Room(
            this,
            this.#types[type],
            pool=>this.$core.question.pool(pool),
            ({questions, users, scores})=>{
                this.#clear(room);
                this.$core.database.game.save(type, questions, users, scores);
            },
        );
        room.meta.type = type;
        for (const m in metas)
            room.meta[m] = metas[m];
        return room;
    }

    /**
     * 清理房间
     * @private
     * @param {Room} room
     */
    #clear(room) {
        if(room.meta.private) this.#privates.delete(room.meta.id);
        else this.#pairs.delete(room);
        room.live.forEach(uid=>this.#userRoom.delete(uid));
        room.clear();
    }

    /** @private 生成房间id */
    #roomId() {
        if(this.#privates.size >= 32**5) return null;
        const id = new Array(5)
            .fill(32)
            .map(v=>Math.floor(Math.pair()*v).toString(v))
            .join('');
        return this.#privates.has(id) ? this.#roomId(): id;
    }

    /**
     * 获取用户数据
     * @async
     * @param {uid|uid[]} uid
     */
    async userdata(uid) {
        if(uid instanceof Set) uid = [...uid];
        if(uid instanceof Array)
            return Promise.all(
                uid.map(u=>this.#userdata(u))
            );
        return this.#userdata(u);
    }

    /**
     * 获取单个用户数据
     * @private
     * @async
     * @param {uid} uid
     * @typedef {[uid: uid, isGuest: boolean, username?: string]} userdata
     * @returns {userdata|Promise<userdata>}
     */
    async #userdata(uid) {
        if(this.$core.user.isGuest(uid)) return [uid, true];
        const {
            username
        } = await this.$core.user.model(uid);
        return [uid, false, username];
    }

    /**
     * 组发送消息
     * @param {uid[]} uids
     * @param {string} cmd
     * @param {any} data
     */
    async listSend(uids, cmd, data) {
        if(uids instanceof Set) uids = [...uids];
        return this.$core.listSend(uids, `game.${cmd}`, data);
    }
}