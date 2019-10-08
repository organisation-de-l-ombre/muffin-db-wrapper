const _ = require("lodash");
const Err = require("./MuffinError");

const _readyCheck = Symbol("readyCheck");
const _typeCheck = Symbol("typeCheck");

class Muffin {

    constructor(base, client) {
        this._base = base;
        this.client = client;
    }

    [_readyCheck]() {
        if (this.client.closed === true) throw new Err("the database has been closed", "MuffinClosedError");
    }

    [_typeCheck](key) {
        return !["number", "string"].includes(key.constructor.name);
    }

    async set(key, val, path = null) {
        try {
            this[_readyCheck]();

            if (_.isNil(key)) throw new Err("key is null or undefined");

            if (!this[_typeCheck]) key = key.toString();
            console.log(key);

            if (path) {
                val = _.set((await this._base.findOne({ _id: key })).value || {}, path, val);
            }

            return await this._base.updateOne({ _id: key }, { $set: { _id: key, value: val } }, { upsert: true });
        } catch (e) {
            console.error(e);
        }
    }

    async get(key, path = null, raw = false) {
        try {
            this[_readyCheck]();

            if (_.isNil(key)) return null;

            if (!this[_typeCheck]) key = key.toString();
            console.log(key);

            const find = await this._base.findOne({ _id: key });
            const data = find.value;
            if (_.isNil(find) || _.isNil(data)) return null;

            if (raw) {
                return find;
            }

            if (path) {
                return _.get(data, path);
            } else {
                return data;
            }
        } catch (e) {
            console.error(e);
        }
    }

    async has(key, path = null) {
        try {
            this[_readyCheck]();

            if (!this[_typeCheck]) key = key.toString();

            const find = await this._base.findOne({ _id: key });
            const data = find.value;
            if (_.isNil(find) || _.isNil(data)) return false;

            if (path) {
                return _.has(data, path);
            }

            return true;
        } catch (e) {
            console.error(e);
        }
    }

    async ensure(key, val, path = null) {
        try {
            this[_readyCheck]();

            if (await this.has(key, path) === false) {
                await this.set(key, val, path);
            }

            return await this.get(key, path);
        } catch (e) {
            console.error(e);
        }
    }

    // This method was mostly taken from Enmap... Licence : https://github.com/eslachance/enmap/blob/master/LICENSE
    async delete(key, path = null) {
        try {
            this[_readyCheck]();

            if (_.isNil(key)) throw new Err("key is null or undefined");

            if (!this[_typeCheck]) key = key.toString();

            if (path) {
                const find = await this._base.findOne({ _id: key });
                let data = find.value;
                if (_.isNil(find) || _.isNil(data)) return;

                path = _.toPath(path);
                const last = path.pop();
                const propValue = path.length ? _.get(data, path) : data;

                if (_.isArray(propValue)) {
                    propValue.splice(last, 1);
                } else {
                    delete propValue[last];
                }

                if (path.length) {
                    _.set(data, path, propValue);
                } else {
                    data = propValue;
                }

                return await this._base.updateOne({ _id: key }, { $set: { _id: key, value: data } }, { upsert: true });
            } else {
                return await this._base.deleteOne({ _id: key }, { single: true });
            }
        } catch (e) {
            console.error(e);
        }
    }

    async clear() {
        try {
            this[_readyCheck]();

            return await this._base.deleteMany({});
        } catch (e) {
            console.error(e);
        }
    }

    valueArray() { return this._base.find({}).map(d => d.value).toArray(); }

    keyArray() { return this._base.find({}).map(d => d._id).toArray(); }

    rawArray() { return this._base.find({}).toArray(); }

    get size() { return this._base.countDocuments(); }

}

module.exports = Muffin;
