import Base from '../base.js';

/** 记录数据模型 */
export default class Record extends Base {
    static indexes = [
        { key: { uid: 1 }, unique: true },
    ];

    async change(uid, records) {
        const ret = await this.$.findOneAndUpdate(
            { uid },
            {
                $inc: this.$flat({ records }, 2),
                $set: { updated: new Date() }
            },
            {
                upsert: true,
                returnDocument: 'after',
                projection: { _id: 0 }
            }
        );
        if(!ret.ok) return false;
        this.$sync(uid, ret.value)
        return true;
    }

    async gets(uid) {
        const data = await this.$.findOne(
            { uid },
            { projection: { _id: 0 } }
        );
        if(!data) return null;
        return data.records;
    }

    async get(uid, key) {
        const data = await this.$.findOne(
            { uid },
            { projection: {
                _id: 0,
                [`records.${key}`]: 1
            } }
        );
        if(!data?.records) return null;
        const keys = key.split('.');
        let ret = data.records;
        for(const k of keys) {
            ret = ret[k];
            if(ret==null) return null;
        }
        return ret;
    }
}