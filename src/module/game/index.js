import IModule from "../imodule.js";
import Room from "./room.js";

export default class Game extends IModule {

    #privates = new Map();
    #randoms = new Set();
    #randomPending = [];
    #userRoom = new Map();

    join(uuid, roomId) {
        if(!this.#privates.has(roomId)) return {r: false};
        const room = this.#privates.get(roomId);
        room.join(uuid);
        this.#userRoom.set(uuid, [room, false, roomId]);
        return {r: true, info: room.info};
    }

    random(uuid) {
        if(this.#userRoom.has(uuid)) return {r: false};
        let room;
        if(this.#randomPending.length > 0) {
            room = this.#randomPending[0];
        } else {
            room = this.#newRoom({});
            this.#randoms.join(room);
            this.#randomPending.push(room);
        }

        room.join(uuid);
        this.#userRoom.set(uuid, [room, true]);

        if(room.ready) {
            this.#randomPending.shift();
        }

        return {r: true, info: room.info};
    }

    leave(uuid) {
        if(!this.#userRoom.has(uuid)) return {r: true};
        const [room, isRandomRoom, roomId] = this.#userRoom.get(uuid)
        this.#userRoom.delete(uuid);
        if(!room.leave(uuid)) return {r: true};
        if(isRandomRoom) this.#randoms.delete(room);
        else this.#privates.delete(roomId);
        return {r: true};
    }

    create(uuid, configure) {
        if(this.#userRoom.has(uuid)) return {r: false};
        const roomId = this.#randomId();
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

    #randomId() {
        if(this.#privates.size >= 32**5) return null;
        const id = new Array(5)
            .fill(32)
            .map(v=>Math.floor(Math.random()*v).toString(v))
            .join('');
        return this.#privates.has(id) ? this.#randomId(): id;
    }
}