import IModule from "../imodule.js";
import UserCommand from './user.js';
import GameCommand from "./game.js";

export default class Commander extends IModule {

    async do(uuid, {c, d}) {
        if(!c) return { r: false, e: $err.NO_CMD };
        const [ns, cmd] = c.split(".");
        let namespace;
        switch(ns) {
            case 'user': namespace = UserCommand; break;
            case 'game':
                if(!this.core.user.isAuthenticated(uuid)) {
                    return {r: false, e: $err.NO_AUTH};
                }
                namespace = GameCommand;
                break;
        }
        if(!namespace.has(cmd)) {
            return { r: false, e: $err.E_NO_CMD };
        }
        const command = namespace.get(cmd);
        return command(uuid, d);
    }

}