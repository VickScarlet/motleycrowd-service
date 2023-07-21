import { start } from './system.js';
process.title = 'Metley Crowd Service';

export const core = await start([
    '../configure.default.js',
    '../configure.js',
]);

export const shutdown = core.shutdown.bind(core);