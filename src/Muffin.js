const _ = require("lodash");
const Err = require("./MuffinError");

const _readyCheck = Symbol("readyCheck");
const _typeCheck = Symbol("typeCheck");

class Muffin {

    /**
     * @constructor
     * @protected
     * @classdesc - A wrapper for a MongoDB Collection, its goal is to provide map-like methods but for a database like Mongo.
     * @description - Initialize a new Muffin.
     * @param {Collection} base - The Collection from MongoDB
     * @param {MuffinClient} client - The client that instantiated the Muffin
     */
    constructor(base, client) {
        this._base = base;
        this.client = client;
    }

    [_readyCheck]() {
        if (this.client.closed === true) throw new Err("the database has been closed", "MuffinClosedError");
    }

    [_typeCheck](key) {
        return ["Number", "String", "Object"].includes(key.constructor.name);
    }

    /**
     * @async
     * @description - Set a element into the database
     * @param {*} key - The key of the element to set
     * @param {*} val - The value of the element to set into the database
     * @param {string} [path=null] - (Optional) The path to the property to modify inside the value. Can be a path with dot notation, such as "prop1.subprop2.subprop3"
     * @returns {boolean} - True, or false if an error was threw
     */
    async set(key, val, path) {
        try {
            this[_readyCheck]();

            if (_.isNil(key)) throw new Err("key is null or undefined");

            if (!this[_typeCheck](key)) key = key.toString();

            if (path) {
                val = _.set((await this._base.findOne({ _id: key })).value || {}, path, val);
            }

            await this._base.updateOne({ _id: key }, { $set: { _id: key, value: val } }, { upsert: true });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    /**
     * @async
     * @description - Find a element in the database
     * @param {*} key - The key of the element to get
     * @param {string} [path=null] - (Optional) The path to the property to modify inside the value. Can be a path with dot notation, such as "prop1.subprop2.subprop3"
     * @param {boolean} [raw=false] - If set to true, affects the return value
     * @returns {(*|Object)} - The value found in the database for this key. If raw is true, it returns the full object instead, i.e. : { _id: "foo", value: "bar" }
     */
    async get(key, path, raw = false) {
        try {
            this[_readyCheck]();

            if (_.isNil(key)) return null;

            if (!this[_typeCheck](key)) key = key.toString();

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

    /**
     * @async
     * @description - Check if an element exists
     * @param {*} key - The key of the element to check
     * @param {string} [path=null] - (Optionnal) The path to the property to check. Can be a path with dot notation, such as "prop1.subprop2.subprop3"
     * @returns {boolean} - True if the element exists, false if it doesn't
     */
    async has(key, path) {
        try {
            this[_readyCheck]();

            if (!this[_typeCheck](key)) key = key.toString();

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

    /**
     * @async
     * @description - Check if an element exists, otherwise, 
     * @param {*} key - The key to check if it exists or to set an element or a property inside the value
     * @param {*} val - The value
     * @param {string} [path=null] - The path to the property to check. Can be a path with dot notation, such as "prop1.subprop2.subprop3"
     * @param {boolean} [raw=false] - If set to true, affects the return value
     * @returns {(*|Object)} - The value found in the database for this key. If raw is true, it returns the full object instead, i.e. : { _id: "foo", value: "bar" }
     */
    async ensure(key, val, path, raw = false) {
        try {
            this[_readyCheck]();

            if (await this.has(key, path) === false) {
                await this.set(key, val, path);
            }

            return await this.get(key, path, raw);
        } catch (e) {
            console.error(e);
        }
    }

    // This method was mostly taken from Enmap... Licence : https://github.com/eslachance/enmap/blob/master/LICENSE
    async delete(key, path) {
        try {
            this[_readyCheck]();

            if (_.isNil(key)) throw new Err("key is null or undefined");

            if (!this[_typeCheck](key)) key = key.toString();

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

                await this._base.updateOne({ _id: key }, { $set: { _id: key, value: data } }, { upsert: true });
            } else {
                await this._base.deleteOne({ _id: key }, { single: true });
            }
            return true;
        } catch (e) {
            console.error(e);
            return false;
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
