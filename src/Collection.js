const _ = require("lodash");
const Err = require("./MuffinError");

const _readyCheck = Symbol("readyCheck");

class Collection {

    constructor(base, client) {
        this._base = base;
        this.client = client;
    }

    [_readyCheck]() {
        if (this.client.closed === true) throw new Err("the database has been closed", "MuffinClosedError");
    }

    async set(key, val, path = null) {
        try {
            this[_readyCheck]();

            if (_.isNil(key)) throw new Err("key is null or undefined");

            key = key.toString();

            if (path != null) {
                val = _.set((await this._base.findOne({ _id: key })).value || {}, path, val);
            }

            await this._base.updateOne({ _id: key }, { $set: { _id: key, value: val } }, { upsert: true });
        } catch (e) {
            console.error(e);
        }
    }

    async get(key, path = null) {
        try {
            this[_readyCheck]();

            if (_.isNil(key)) return null;

            key = key.toString();

            const data = (await this._base.findOne({ _id: key })).value;

            if (_.isNil(data)) return null;

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
        try {
            this[_readyCheck]();

            key = key.toString();

            const data = (await this._base.findOne({ _id: key })).value;

            if (data == null) return false;

            if (path) {
                return _.has(data, path);
            }

            return true;
        } catch (e) {
            console.error(e);
        }
    }

    async ensure(key, val, path = null) {
        this[_readyCheck]();

        try {
            if (this.has(key, path) === false) {
                await this.set(key, val, path);
            }

            return this.get(key, path);
        } catch (e) {
            console.error(e);
        }
    }

}

module.exports = Collection;
