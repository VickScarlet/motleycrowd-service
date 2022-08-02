export default class Logger{
    constructor({display=true}={}) {
        if(display) {
            this.log = console.log;
            this.debug = console.debug;
            this.info = console.info;
            this.warn = console.warn;
            this.error = console.error;
            this.table = console.table;
        } else {
            this.log =
            this.debug =
            this.info =
            this.warn =
            this.error =
            this.table = () => {
                // do nothing
            };
        }
    }

}