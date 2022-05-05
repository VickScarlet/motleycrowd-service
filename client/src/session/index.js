export default class Session {
    constructor({protocol = 'ws', host, port, handler} = {}) {
        this.#protocol = protocol;
        this.#host = host;
        this.#port = port;
        this.#handler = handler;
        this.#connect();
    }

    #protocol;
    #host;
    #port;
    #ws = null;
    #callbacks = new Map();
    #handler;

    get #url() {
        if(this.#host) {
            if(this.#port) return `${this.#protocol}://${this.#host}:${this.#port}`;
            return `${this.#protocol}://${this.#host}`;
        }
        return `${this.#protocol}://${globalThis.location.host}`;
    }

    #connect() { 
        this.#ws = new WebSocket(this.#url); 
        this.#ws.onmessage = event => this.#onmessage(event.data);
        this.#ws.onclose = () => this.#onclose();
    }

    #onmessage(message) {
        const data = JSON.parse(message);
        switch(data[0]) {
            case 2:
                if(this.#callbacks.has(data[1])) 
                    this.#callbacks.get(data[1])(data[2]);
                break;
            case 0:
            case 1:
            default: 
                if(this.#handler) 
                    this.#handler(data[1]);
                break;
        }
    }

    #onclose() {
        this.#ws = null;
    }

    #send(data) {
        this.#ws.send(JSON.stringify(data));
    }

    close() {
        this.#ws.close();
    }

    async command(command, data) {
        return new Promise(resolve => {
            const guidF = crypto.randomUUID();
            const L = guidF.length;
            for(let i = 1; i<=L; i++) {
                const guid = guidF.substring(0, i)
                if(this.#callbacks.has(guid)) continue;
                this.#callbacks.set(guid, ret=>resolve(ret));
                this.#send([guid, {c: command, d: data}]);
                return;
            }
        });
    }
    
    async authenticate(username, password) {
        const result = await this.command('authenticate', {username, password});
        console.debug('authenticate result', result);
    }

}