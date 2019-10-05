const _ = require("lodash");
const Err = require("./MuffinError");

const _readyCheck = Symbol("readyCheck");

class Collection {

    constructor(base, client) {
        this._base = base;
        this._cache = new Map();
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
                val = _.set((await this._base.findOne({ _id: key })).value || {}, path, val);
            }

            if (cache && val !== this._cache.get(key)) {
                await this._cache.set(key, val);
            }

            await this._base.updateOne({ _id: key }, { $set: { _id: key, value: val } }, { upsert: true });
        } catch (e) {
            console.error(e);
        }
    }

    async get(key, path = null, cache = true) {
        try {
            this[_readyCheck]();

            if (_.isNil(key)) return null;

            key = key.toString();

            const data = this._cache.get(key) || (await this._base.findOne({ _id: key })).value;

            if (_.isNil(data)) return null;

            if (cache && data !== this._cache.get(key)) {
                this._cache.set(key, data);
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

    async has(key, path = null) {
        this[_readyCheck]();

        key = key.toString();

        const data = this._cache.get(key) || (await this._base.findOne({ _id: key })).value;

        if (data == null) return false;

        if (path) {
            return _.has(data, path);
        }

        return true;
    }

    async ensure(key, val, path = null, cache = true) {
        this[_readyCheck]();

        try {
            if (this.has(key, path) === false) {
                await this.set(key, val, path, cache);
            }

            return this.get(key, path, cache);
        } catch (e) {
            console.error(e);
        }
    }

    uncacheOne(key) {
        key = key.toString();

        if (this._cache.has(key)) this._cache.delete(key);
    }

    uncacheMany(ArrayOfKeys) {
        ArrayOfKeys.map(key => {
            key = key.toString();

            if (this._cache.has(key)) this._cache.delete(key);
        });
    }

    uncacheAll() {
        return this._cache.clear();
    }

}

module.exports = Collection;
