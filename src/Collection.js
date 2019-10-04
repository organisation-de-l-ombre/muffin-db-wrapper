const _ = require("lodash");
const Err = require("./MuffinError");

const _readyCheck = Symbol("readyCheck");

class Collection {

    constructor(base, client) {
        this.base = base;
        this.cache = new Map();
        this.client = client;
    }

    [_readyCheck]() {
        if (this.client.closed === true) throw new Err("the database has been closed", "MuffinClosedError");
    }

    async set(key, val, path = null, cache = true) {
        try {
            this[_readyCheck]();

            if (_.isNil(key)) throw new Err("key is null or undefined");

            key = key.toString();

            if (path != null) {
                const result = await this.base.findOne({ _id: key });
                val = _.set(result.value || {}, path, val);
            }

            if (cache && val !== this.cache.get(key)) {
                await this.cache.set(key);
            }

            await this.base.updateOne({ _id: key }, { $set: { _id: key, value: val } }, { upsert: true });

            return this;
        } catch (e) {
            console.error(e);
        }
    }

    async get(key, path = null, cache = true) {
        try {
            this[_readyCheck]();

            if (_.isNil(key)) return null;

            key = key.toString();

            const result = await this.base.findOne({ _id: key });
            const data = this.cache.get(key) || result.value;

            if (_.isNil(data)) return null;

            if (cache && data !== this.cache.get(key)) {
                this.cache.set(key);
            }

            if (path == null) {
                return data;
            } else {
                return _.get(data, path);
            }
        } catch (e) {
            console.error(e);
        }
    }

    has(key, path = null) {

    }

    async ensure(key, path = null, cache = true) {
        try {

        } catch (e) {
            console.error(e);
        }
    }

}

module.exports = Collection;
