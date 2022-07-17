import { Log4js } from 'log4js';

export default function log(configure) {
    const logger = Log4js.getLogger();
    logger.configure(configure);
}