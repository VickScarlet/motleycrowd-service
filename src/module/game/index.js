import IModule from "../imodule.js";
import Room from "./room.js";

export default class Game extends IModule {

    #privates = new Map();
    #pairs = new Set();
    #pairPending = [];
    #userRoom = new Map();

    initialize() {
        this.$core.proxy('game', {
            create: (uid, configure) => this.create(uid, configure),
            join: (uid, {room}) => this.join(uid, room),
            pair: (uid, {type}) => this.pair(uid, type),
            leave: uid => this.leave(uid),
            answer: (uid, {answer, question}) => this.answer(uid, answer, question),
        });
    }

    join(uid, roomId) {
        if(!this.#privates.has(roomId)) return {r: false};
        const room = this.#privates.get(roomId);
        room.join(uid);
        this.#userRoom.set(uid, [room, false, roomId]);
        return {r: true, info: room.info};
    }

    pair(uid, type) {
        // TODO: pair type;
        // logger.debug("[Game|pair] [type:%s] [uid:%s]", type, uid);
        if(this.#userRoom.has(uid)) return {r: false};
        let room;
        if(this.#pairPending.length > 0) {
            room = this.#pairPending[0];
        } else {
            room = this.#newRoom({});
            this.#pairs.add(room);
            this.#pairPending.push(room);
        }

        room.join(uid);
        this.#userRoom.set(uid, [room, true]);

        if(room.ready) {
            this.#pairPending.shift();
        }

        return {r: true, info: room.info};
    }

    leave(uid) {
        if(!this.#userRoom.has(uid)) return {r: true};
        const [room, isPairRoom, roomId] = this.#userRoom.get(uid)
        this.#userRoom.delete(uid);
        if(!room.leave(uid)) return {r: true};
        if(isPairRoom) this.#pairs.delete(room);
        else this.#privates.delete(roomId);
        return {r: true};
    }

    create(uid, configure) {
        if(this.#userRoom.has(uid)) return {r: false};
        const roomId = this.#roomId();
        const room = this.#newRoom(configure);
        this.#privates.set(roomId, room);
        this.#userRoom.set(uid, [room, false, roomId]);
        room.join(uid);
        return {r: true, room: roomId};
    }

    answer(uid, answer, question) {
        if(!this.#userRoom.has(uid)) return {r: false};
        const [room] = this.#userRoom.get(uid);
        return {r: room.answer(uid, answer, question)};
    }

    #newRoom(configure) {
        return new Room(configure);
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