import { start } from './system.js';
process.title = 'Metley Crowd Service';

start([
    '../configure.default.js',
    '../configure.js',
]);