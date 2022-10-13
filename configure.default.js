export function core() { return {
    sheet: {
        load: sheet=>import(`./data/${sheet}.js`)
            .then(module=> module.default)
            .catch(_=>null),
        freeze: true,
        sheets: [ 'achievement', 'reward', 'goods' ],
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
            Achievement: { collection: 'achievement' },
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
    shop: {
        cron: '0 0 6,18 * * *',
        sheleves: {
            badge: {
                count: 4,
                discounts: [0.7],
            },
            card: {
                count: 4,
                discounts: [0.7],
            }
        }
    },
} }

export function log4js() { return {
    appenders: {
        out: { type: "stdout" },
        daily: { type: "logLevelFilter", appender:"dailyFile", level: "info" },
        dailyFile: {
            type: "dateFile",
            filename: "logs/daily/app",
            pattern: "yyyy-MM-dd.log",
            alwaysIncludePattern: true,
            compress: true,
            backups: 30,
            level: "info",
            // layout: { type: "pattern", pattern: "[%d %p] %c - %m" },
        },
        error: { type: "logLevelFilter", appender:"errorFile", level: "error" },
        errorFile: {
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