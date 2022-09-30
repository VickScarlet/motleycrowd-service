import Base from '../base.js';

export default class Achievement extends Base {
    static indexes = [
        { key: { uid: 1 }, unique: true },
    ];

    async isUnlock(uid, achievement) {
        const count = await this.$.countDocuments({
            uid, [`achvs.${achievement}`]: { $gte: 1 },
        });
        return count > 0;
    }

    async unlock(uid, achievement) {
        const ret = await this.$.findOneAndUpdate(
            { uid },
            { $set: {
                [`achvs.${achievement}`]: 1,
                updated: new Date()
            } },
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
}