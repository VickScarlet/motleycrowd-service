import { start as repl } from 'node:repl';
import { core, shutdown } from './index.js';

const options = { useColors: true };
const r = repl(options);
r.context.core = core;

r.on('reset', () => r.context.core = core);
r.on('exit', shutdown);
r.defineCommand('shutdown', {
    help: 'Shutdown the service',
    action() {
        shutdown();
        this.close();
    }
});