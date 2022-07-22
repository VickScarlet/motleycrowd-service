import IModule from "../imodule.js";
import Room from "./room.js";

export default class Game extends IModule {

    #privates = new Map();
    #pairs = new Set();
    #pairPending = [];
    #userRoom = new Map();

    join(uuid, roomId) {
        if(!this.#privates.has(roomId)) return {r: false};
        const room = this.#privates.get(roomId);
        room.join(uuid);
        this.#userRoom.set(uuid, [room, false, roomId]);
        return {r: true, info: room.info};
    }

    pair(uuid, type) {
        // TODO: pair type;
        console.debug("[Game|pair] [type:%s] [uuid:%s]", type, uuid);
        if(this.#userRoom.has(uuid)) return {r: false};
        let room;
        if(this.#pairPending.length > 0) {
            room = this.#pairPending[0];
        } else {
            room = this.#newRoom({});
            this.#pairs.add(room);
            this.#pairPending.push(room);
        }

        room.join(uuid);
        this.#userRoom.set(uuid, [room, true]);

        if(room.ready) {
            this.#pairPending.shift();
        }

        return {r: true, info: room.info};
    }

    leave(uuid) {
        if(!this.#userRoom.has(uuid)) return {r: true};
        const [room, isPairRoom, roomId] = this.#userRoom.get(uuid)
        this.#userRoom.delete(uuid);
        if(!room.leave(uuid)) return {r: true};
        if(isPairRoom) this.#pairs.delete(room);
        else this.#privates.delete(roomId);
        return {r: true};
    }

    create(uuid, configure) {
        if(this.#userRoom.has(uuid)) return {r: false};
        const roomId = this.#pairId();
        const room = this.#newRoom(configure);
        this.#privates.set(roomId, room);
        this.#userRoom.set(uuid, [room, false, roomId]);
        room.join(uuid);
        return {r: true, room: roomId};
    }

    answer(uuid, answer, question) {
        if(!this.#userRoom.has(uuid)) return {r: false};
        const [room] = this.#userRoom.get(uuid);
        return {r: room.answer(uuid, answer, question)};
    }

    #newRoom(configure) {
        return new Room(configure);
    }

    #pairId() {
        if(this.#privates.size >= 32**5) return null;
        const id = new Array(5)
            .fill(32)
            .map(v=>Math.floor(Math.pair()*v).toString(v))
            .join('');
        return this.#privates.has(id) ? this.#pairId(): id;
    }
}