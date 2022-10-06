import Base from '../base.js';

export default class Asset extends Base {
    static indexes = [
        { key: { uid: 1 }, unique: true },
    ];

    async changeAssets(uid, assets) {
        const ret = await this.$.findOneAndUpdate(
            { uid },
            {
                $inc: $utils.flat({assets}, 2),
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

    async reward(uid, assets) {
        return this.changeAssets(uid, assets);
    }

    async consume(uid, assets) {
        const flated = $utils.flat({assets}, 2);
        const check = {uid};
        for(const key in flated) {
            const value = flated[key];
            check[key] = { $gte: value };
            flated[key] = -value;
        }
        const ret = await this.$.findOneAndUpdate(
            check,
            {
                $inc: flated,
                $set: { updated: new Date() }
            },
            {
                returnDocument: 'after',
                projection: { _id: 0 }
            }
        );
        if(!ret.ok) return false;
        this.$sync(uid, ret.value)
        return true;
    }

    async check(uid, assets) {
        const flated = $utils.flat({assets}, 2);
        const check = {uid};
        for(const key in flated) {
            check[key] = {
                $gte: flated[key]
            };
        }
        const count = await this.$.countDocuments(check);
        return count > 0;
    }

    async gets(uid) {
        const data = await this.$.findOne(
            { uid },
            { projection: { _id: 0 } }
        );
        if(!data) return null;
        return data.assets;
    }
}