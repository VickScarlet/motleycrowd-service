import IModule from "../imodule.js";
import Room from "./room.js";

export default class Game extends IModule {

    #types;
    #privates = new Map();
    #pairs = new Set();
    #pairPending = new Map();
    #userRoom = new Map();

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

    async initialize() {
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

    #leave(uid) {
        if(!this.#userRoom.has(uid)) return;
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

    async #resume(uid) {
        if(!this.#userRoom.has(uid)) return;
        const room = this.#userRoom.get(uid);
        const data = await room.resume(uid);
        if(!data) {
            this.#leave(uid);
            return;
        }
        this.$core.send(uid, `game.resume`, data);
    }

    #pending(uid) {
        const room = this.#userRoom.get(uid);
        if(!room || room.start) return;
        this.#leave(uid);
    }

    async join(uid, roomId) {
        if(!this.#privates.has(roomId)) return [1];
        const room = this.#privates.get(roomId);
        room.join(uid);
        this.#userRoom.set(uid, room);
        const info = await room.info();
        return [0, info];
    }

    async pair(uid, type) {
        type = type&&''+type;
        if(this.#userRoom.has(uid)) return [this.$err.GAME_IN_ROOM];
        if(!this.#types.propertyIsEnumerable(type)) return [this.$err.NO_GAME_TYPE];
        const pending = this.#pairPending.get(type);
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

    async leave(uid) {
        this.#leave(uid);
        return [0];
    }

    async create(uid, type) {
        type = type&&''+type;
        if(this.#userRoom.has(uid)) return [this.$err.GAME_IN_ROOM];
        if(!this.#types.propertyIsEnumerable(type)) return [this.$err.NO_GAME_TYPE];
        const roomId = this.#roomId();
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

    async answer(uid, answer, idx) {
        if(!this.#userRoom.has(uid)) return [1];
        const room = this.#userRoom.get(uid);
        const result = room.answer(uid, answer, idx);
        return [result?0:1];
    }

    #newRoom(type, metas) {
        const room = new Room(this, this.#types[type]);
        room.meta.type = type;
        for (const m in metas)
            room.meta[m] = metas[m];
        return room;
    }

    #clear(room) {
        if(room.meta.private) this.#privates.delete(room.meta.id);
        else this.#pairs.delete(room);
        room.live.forEach(uid=>this.#userRoom.delete(uid));
        room.clear();
    }

    #roomId() {
        if(this.#privates.size >= 32**5) return null;
        const id = new Array(5)
            .fill(32)
            .map(v=>Math.floor(Math.pair()*v).toString(v))
            .join('');
        return this.#privates.has(id) ? this.#roomId(): id;
    }

    async userdata(uid) {
        if(uid instanceof Set) uid = [...uid];
        if(uid instanceof Array)
            return Promise.all(
                uid.map(u=>this.#userdata(u))
            );
        return this.#userdata(u);
    }

    async #userdata(uid) {
        if(this.$core.user.isGuest(uid)) return [uid, true];
        const {
            username
        } = await this.$core.user.model(uid);
        return [uid, false, username];
    }

    async listSend(uids, cmd, data) {
        if(uids instanceof Set) uids = [...uids];
        return this.$core.listSend(uids, `game.${cmd}`, data);
    }

    randomQuestion(users) {
        if(users instanceof Set) users = [...users];
        return this.$core.question.random(users);
    }

    settlement(room, questions, users, scores) {
        const type = room.meta.type;
        this.#clear(room);
        this.$core.database.game.save(type, questions, users, scores);
    }
}