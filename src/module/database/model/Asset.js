import Base from '../base.js';

export default class Asset extends Base {
    static indexes = [
        { key: { uid: 1 }, unique: true },
    ];

    async changeAssets(uid, assets) {
        const ret = await this.updateOne(
            { uid },
            {
                $inc: this.$flat({assets}, 2),
                $set: { updated: new Date() }
            },
            { upsert: true }
        );
        return ret.acknowledged;
    }

    async reward(uid, assets) {
        return this.changeAssets(uid, assets);
    }

    async consume(uid, assets) {
        const flated = this.$flat({assets}, 2);
        const check = {uid};
        for(const key in flated) {
            const value = flated[key];
            check[key] = { $gte: value };
            flated[key] = -value;
        }
        const ret = await this.updateOne(check, {
            $inc: flated, $set: { updated: new Date() }
        });
        return ret.matchedCount > 0;
    }

    async check(uid, assets) {
        const flated = this.$flat({assets}, 2);
        const check = {uid};
        for(const key in flated) {
            check[key] = {
                $gte: flated[key]
            };
        }
        const count = await this.countDocuments(check);
        return count > 0;
    }
}