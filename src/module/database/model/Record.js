import Base from '../base.js';

/** 记录数据模型 */
export default class Record extends Base {
    static indexes = [
        { key: { uid: 1 }, unique: true },
    ];

    async #update(uid, update) {
        const ret = await this.$.findOneAndUpdate(
            { uid }, update,
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

    async set(uid, records) {
        return this.#update(uid, { $set: {
            updated: new Date(),
            ...this.$flat({records}, 2)
        }});
    }

    async records(uid, records) {
        const {c, m, s, v} = records;
        const update = {
            $set: {updated: new Date()}
        };
        const flat = (k, v) => this.$flat({records: {[k]: v}}, 2);
        if(c) update.$inc = flat('c', c);
        if(m) update.$max = flat('m', m);
        if(s) {
            const $suc = flat('s', s);
            const $inc = {}
            for(const k in $suc) {
                if(!$suc[k]) update.$set[k] = 0;
                else $inc[k] = 1;
            }
            if(update.$inc) Object.assign(update.$inc, $inc);
            else update.$inc = $inc;
        }
        if(v) Object.assign(update.$set, flat('v', v));
        return this.#update(uid, update);
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