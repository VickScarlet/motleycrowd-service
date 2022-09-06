/**
 * @typedef {import('../user').uid} uid
 * @typedef {import('../question').Questions} Questions
 * @typedef {import('..').CommandResult} CommandResult
 * @typedef {Object} RoomConfigure
 * @property {number} limit
 * @property {number} pool
 * @property {number} reward
 * @typedef {[ranking: number, reward][]} RewardConfigure
 * @typedef {Object} configure
 * @property {[type: number, RoomConfigure][]} types
 * @property {[type: number, RewardConfigure][]} rewards
 */
import IModule from "../imodule.js";
import Room from "./room.js";
import Reward from "./reward.js";

export default class Game extends IModule {
    /** @private 类型配置 @type {{[type: number]: RoomConfigure}} */
    #types;
    #rewards;
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
        this.#types.forEach(
            type =>pending[type] = this.#pairPending.get(type).length
        );
        return {
            users: this.#userRoom.size,
            privates: this.#privates.size,
            pairs: this.#pairs.size,
            pending,
        }
    }

    proxy() {
        return [{
            create: (uid, {type}) => this.create(uid, type),
            join: (uid, {room}) => this.join(uid, room),
            pair: (uid, {type}) => this.pair(uid, type),
            leave: uid => this.leave(uid),
            answer: (uid, [idx, answer]) => this.answer(uid, answer, idx),
        }, false];
    }

    /**
     * @override
     * @returns {Promise<void>}
     */
    async initialize() {
        /** @type {configure} */
        const {types, rewards} = this.$configure;
        this.#types = new Map(types);
        this.#rewards = new Map(rewards.map(
            ([type, rewards]) => [type, new Reward(rewards)]
        ));

        for (const [type] of types) {
            this.#pairPending.set(type, []);
        }
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
     * @param {uid} uid
     */
    #resume(uid) {
        if(!this.#userRoom.has(uid)) return;
        /** @type {Room} */
        const room = this.#userRoom.get(uid);
        const data = room.resume(uid);
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
     * @param {uid} uid
     * @param {uid} roomId
     * @returns {CommandResult}
     */
    join(uid, roomId) {
        if(!this.#privates.has(roomId)) return [1];
        /** @type {Room} */
        const room = this.#privates.get(roomId);
        room.join(uid);
        this.#userRoom.set(uid, room);
        return [0, room.info];
    }

    /**
     * 匹配房间
     * @param {uid} uid
     * @param {number} type
     * @returns {CommandResult}
     */
    pair(uid, type) {
        if(this.#userRoom.has(uid)) return [this.$err.GAME_IN_ROOM];
        if(!this.#types.has(type)) return [this.$err.NO_GAME_TYPE];
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

        return [0, room.info];
    }

    /**
     * 离开房间
     * @param {uid} uid
     * @returns {CommandResult}
     */
    leave(uid) {
        this.#leave(uid);
        return [0];
    }

    /**
     * 创建房间
     * @param {uid} uid
     * @param {number} type
     * @returns {CommandResult}
     */
    create(uid, type) {
        if(this.#userRoom.has(uid)) return [this.$err.GAME_IN_ROOM];
        if(!this.#types.has(type)) return [this.$err.NO_GAME_TYPE];
        const roomId = this.#roomId();
        /** @type {Room} */
        const room = this.#newRoom(type, {
            private: true,
            id: roomId,
        });
        this.#privates.set(roomId, room);
        this.#userRoom.set(uid, room);
        room.join(uid);

        return [0, {
            room: roomId,
            info: room.info
        }];
    }

    /**
     * 回答问题
     * @param {uid} uid
     * @param {string} answer
     * @param {number} idx
     * @returns {CommandResult}
     */
    answer(uid, answer, idx) {
        if(!this.#userRoom.has(uid)) return [1];
        /** @type {Room} */
        const room = this.#userRoom.get(uid);
        const result = room.answer(uid, answer, idx);
        return [result?0:1];
    }

    /**
     * 创建房间
     * @private
     * @param {number} type
     * @param {object} metas
     * @returns {Room}
     */
    #newRoom(type, metas) {
        const { limit, pool, reward } = this.#types.get(type);
        const questions = this.$question.pool(pool);
        const room = new Room(
            this, limit, questions,
            ()=>this.#settlement(
                room, type,
                this.#rewards.get(reward)
            ),
        );
        room.meta.type = type;
        Object.assign(room.meta, metas);
        return room;
    }

    /**
     * @private
     * @async
     * @param {Room} room
     * @param {string} type
     * @param {Reward} reward
     */
    async #settlement(room, type, reward) {
        const {questions, users} = room;
        this.#clear(room);
        const settlement = questions.settlement(users);
        const meta = questions.meta;
        const notGuest = [...users].filter(uid=>!this.$user.isGuest(uid));
        let id, created;
        if(notGuest.length > 0) {
            const result = await this.$db.game.save(
                type, meta, [...users], settlement
            );
            id = result.id;
            created = result.created;
            await Promise.allSettled(
                notGuest.map(async uid=>{
                    const [,,ranking] = settlement[uid];
                    await this.$asset.reward(uid, reward.get(ranking));
                })
            );
        }
        users.forEach(uid=>{
            this.$core.send(uid, 'game.settlement', {
                id, created,
                questions: meta,
                scores: settlement,
            });
        })
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