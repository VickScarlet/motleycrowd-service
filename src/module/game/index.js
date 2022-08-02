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
            create: (uid, configure) => this.create(uid, configure),
            join: (uid, {room}) => this.join(uid, room),
            pair: (uid, {type}) => this.pair(uid, type),
            leave: uid => this.leave(uid),
            answer: (uid, {answer, question}) => this.answer(uid, answer, question),
        });
    }

    async join(uid, roomId) {
        if(!this.#privates.has(roomId)) return {r: false};
        const room = this.#privates.get(roomId);
        room.join(uid);
        this.#userRoom.set(uid, [room, false, roomId]);
        const info = await room.info();
        return {r: true, info};
    }

    async pair(uid, type) {
        type = type&&''+type;
        // TODO: pair type;
        // logger.debug("[Game|pair] [type:%s] [uid:%s]", type, uid);
        if(this.#userRoom.has(uid)) return {r: false, e: this.$err.GAME_IN_ROOM};
        if(!this.#types.propertyIsEnumerable(type)) return {r: false, e: this.$err.NO_GAME_TYPE};
        const pending = this.#pairPending.get(type);
        let room;
        if(pending.length > 0) {
            room = pending[0];
        } else {
            room = this.#newRoom(type);
            this.#pairs.add(room);
            pending.push(room);
        }

        room.join(uid);
        this.#userRoom.set(uid, [room, true]);

        if(room.ready) {
            pending.shift();
        }

        const info = await room.info();
        return {r: true, info};
    }

    async leave(uid) {
        if(!this.#userRoom.has(uid)) return {r: true};
        const [room, isPairRoom, roomId] = this.#userRoom.get(uid)
        this.#userRoom.delete(uid);
        if(!!room.leave(uid)) return {r: true};
        if(isPairRoom) this.#pairs.delete(room);
        else this.#privates.delete(roomId);
        room.clear();
        return {r: true};
    }

    async create(uid, {type}={}) {
        type = type&&''+type;
        if(this.#userRoom.has(uid)) return {r: false, e: this.$err.GAME_IN_ROOM};
        if(!this.#types.propertyIsEnumerable(type)) return {r: false, e: this.$err.NO_GAME_TYPE};
        const roomId = this.#roomId();
        const room = this.#newRoom(type);
        this.#privates.set(roomId, room);
        this.#userRoom.set(uid, [room, false, roomId]);
        room.join(uid);
        return {r: true, room: roomId};
    }

    async answer(uid, answer, question) {
        if(!this.#userRoom.has(uid)) return {r: false};
        const [room] = this.#userRoom.get(uid);
        return {r: room.answer(uid, answer, question)};
    }

    #newRoom(type) {
        return new Room(this.$core, this.#types[type]);
    }

    #roomId() {
        if(this.#privates.size >= 32**5) return null;
        const id = new Array(5)
            .fill(32)
            .map(v=>Math.floor(Math.pair()*v).toString(v))
            .join('');
        return this.#privates.has(id) ? this.#roomId(): id;
    }
}