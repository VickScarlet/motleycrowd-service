import achievement from './data/achievement.js';
import badge from './data/badge.js';
import card from './data/card.js';

export function core() { return {
    sheet: {
        sheets: { achievement, badge, card },
        freeze: true,
    },
    database: {
        url: 'mongodb://127.0.0.1:27017',
        dbName: 'test-motleycrowd',
        options: { useNewUrlParser: true },
        gsync: ['user', 'asset', 'record', 'achievement'],
        model: {
            KVData: { collection: 'kvdata' },
            Auth: { collection: 'auth' },
            User: { collection: 'user' },
            Game: { collection: 'game' },
            Score: { collection: 'score' },
            Asset: { collection: 'asset' },
            Record: { collection: 'record' },
        }
    },
    session: {
        host: '127.0.0.1',
        port: 1919,
        cron: '0 */1 * * * *',
        hold: 1000 * 60 * 1,
        authLimit: 5000,
    },
    game: {
        types: [
            [ 10, { limit:  10, pool:  10, reward: r=>`r10#${r}` }],
            [100, { limit: 100, pool: 100, reward: r=>`r100#${r}` }],
        ],
    },
    rank: { cron: '0 0 */1 * * *' },
    question: {},
    user: {},
} }

export function log4js() { return {
    appenders: {
        out: { type: "stdout" },
        daily: {
            type: "dateFile",
            filename: "logs/daily/app",
            pattern: "yyyy-MM-dd.log",
            alwaysIncludePattern: true,
            compress: true,
            backups: 30,
            // layout: { type: "pattern", pattern: "[%d %p] %c - %m" },
        },
        error: { type: "logLevelFilter", appender:"file", level: "error" },
        file: {
            type: "file",
            filename: "logs/error.log",
            maxLogSize: 10485760,
            backups: 3,
            compress: true
        },
    },
    categories: {
        default: {
            appenders: ['out', 'daily', 'error'],
            level: "debug"
        },
    }
} }