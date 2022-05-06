import * as commands from './cmd/index.js';
export default class Commander {

    async do(uuid, {c, d}) {
        const command = commands[c];
        if(!command) {
            return { r: false, e: $err.E_NO_CMD };
        }
        return command(uuid, d);
    }

}