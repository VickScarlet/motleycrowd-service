import { readFile } from 'fs/promises';
import * as utils from './functions/index.js';
import * as logic from './functions/logic.js';
import * as normalize from './functions/normalize.js';
import {on, off, emit} from './event/index.js';
import Log4js from 'log4js';
import Core from './module/index.js';

global.$ = {};
global.$.utils =
global.$u =
global.$utils = utils;
global.$.logic =
global.$logic = logic;
global.$.normalize =
global.$norml = normalize;
global.$normalize = normalize;
global.$on = on;
global.$off = off;
global.$emit = emit;
global.$.event =
global.$event = {on, off, emit};

async function configure(mods, lists) {
    const configure = {};
    for (const mod of mods) {
        configure[mod] = {};
    }
    await Promise
        .all(lists.map(p=>import(p).catch(_=>null)))
        .then(modules=>modules.forEach(m => {
            if(!m) return;
            for (const mod of mods) {
                if(!m[mod]) continue;
                Object.assign(configure[mod], m[mod]());
            }
        }));
    return configure;
}

function initLogger({appenders, categories}) {
    Log4js.configure({appenders, categories});
    global.$.Log4js =
    global.$Log4js = Log4js;
    global.$.logger =
    global.$l =
    global.$logger = new Proxy(Log4js, {
        get(target, key) { return target.getLogger(key); }
    });
}

async function initCore(configure) {
    const meta = JSON.parse(
        await readFile(
            new URL('../package.json', import.meta.url)
        )
    );
    const core = new Core(meta, configure);
    global.$.core =
    global.$$ =
    global.$core = core;
    await core.initialize();
}

export async function start(cfgList) {
    const { log4js, core } = await configure(
        ['core', 'log4js'],
        cfgList
    );
    initLogger(log4js);
    initCore(core);
}

export default start;