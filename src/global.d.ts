import * as iutils from './functions/index.js';
import * as ilogic from './functions/$logic.js';
import * as inormalize from './functions/normalize.js';
import iLog4js from 'log4js';
import Core from './module/index.js';

let category: string;
declare global {
    let $utils = iutils;
    let $u = iutils;
    let $logic = ilogic;
    let $normalize = inormalize;
    let $norml = inormalize;
    let $Log4js = iLog4js;
    let $core = new Core();
    let $$ = core;
    let $logger = new Proxy({
        [category]: Log4js.getLogger(category)
    });
    let $l = logger;
    let $ = {
        utils: $utils,
        logic: $logic,
        normalize: $normalize,
        Log4js: $Log4js,
        logger: $logger,
        core: $core,
    };
}