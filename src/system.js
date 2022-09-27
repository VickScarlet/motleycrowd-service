import { readFile } from 'fs/promises';
import Log4js from 'log4js';
import Core from './module/index.js';

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
    global.Log4js = Log4js;
    global.$l =
    global.logger = new Proxy(Log4js, {
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
    global.$ =
    global.core = core;
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