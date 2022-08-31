/**
 * @typedef {{collection?: string}} configure
 */
import mongoose from 'mongoose';

/** 用户数据模型 */
export default class Base {
    /** @static @type {string} */
    static Name;
    /** @static @type {import('mongoose').SchemaDefinition} */
    static Schema;
    /**
     * @constructor
     * @param {configure} [configure={}]
     */
    constructor({collection}={}) {
        const schema = new mongoose.Schema(this.$.Schema);
        this.#model = mongoose.model(
            this.$.Name,
            schema,
            collection,
            this.$.Options
        );
    }
    /** @private */
    #model;

    /** @readonly @type {typeof Base} */
    get $() { return this.constructor; }
    /** @readonly */
    get $model() { return this.#model; }

    $find(query, projection, options) {
        return this.#model.findOne(query, projection, options);
    }

    $findOne(query, projection, options) {
        return this.#model.findOne(query, projection, options);
    }

    $findMany(query, projection, options) {
        return this.#model.find(query, projection, options);
    }

    $create(data) {
        const model = new this.#model(data);
        return model.save();
    }

    $update(filter, update, options) {
        return this.#model.updateOne(filter, update, options);
    }

    $updateOne(filter, update, options) {
        return this.#model.updateOne(filter, update, options);
    }

    $updateMany(filter, update, options) {
        return this.#model.updateMany(filter, update, options);
    }

    $delete(filter, update, options) {
        return this.#model.deleteOne(filter, update, options);
    }

    $deleteOne(filter, options) {
        return this.#model.deleteOne(filter, options);
    }

    $deleteMany(filter, options) {
        return this.#model.deleteMany(filter, options);
    }
}