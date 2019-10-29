/* eslint-disable max-len */
const _ = require("lodash");
const Err = require("./MuffinError");

const _readyCheck = Symbol("readyCheck");
const _typeCheck = Symbol("typeCheck");

class Piece {

    /**
     * @class
     * @protected
     * @classdesc An object similar to Map but without cache, used to interact with the database
     * @since 1.0.0
     * @description Initialize a new Piece.
     * @param {Collection} base - The [Collection]{@link https://mongodb.github.io/node-mongodb-native/3.3/api/Collection.html} from MongoDB
     * @param {MuffinClient} client - The client that instantiated the Piece
     */
    constructor(base, client) {
        /**
         * @since 1.0.0
         * @member {Collection} - The collection wrapped by the piece
         */
        this.base = base;

        /**
         * @since 1.0.0
         * @member {MuffinClient} - The client that instantiated the Piece
         */
        this.client = client;
    }

    [_readyCheck]() {
        if (this.client.isClosed) throw new Err("the database has been closed", "MuffinClosedError");
    }

    [_typeCheck](key) {
        return ["Number", "String", "Object"].includes(key.constructor.name);
    }

    /**
     * @async
     * @since 1.0.0
     * @description Sets a document into the database
     * @param {*} key - The key of the document to set
     * @param {*} val - The value of the document to set into the database
     * @param {string} [path=null] - The path to the property to modify inside the value. Can be a dot-separated path, such as "prop1.subprop2.subprop3"
     * @returns {Promise<void>} A promise
     */
    async set(key, val, path) {
        this[_readyCheck]();

        if (_.isNil(key)) throw new Err("key is null or undefined");

        if (!this[_typeCheck](key)) key = key.toString();

        if (_.isNil(val)) throw new Err("val is null or undefined");

        if (path) {
            const find = await this.base.findOne({ _id: key });

            val = _.set(find.value || {}, path, val);
        }

        await this.base.updateOne({ _id: key }, { $set: { _id: key, value: val } }, { upsert: true });
    }

    /**
     * @async
     * @description Push to an array value
     * @since 1.2.0
     * @param {*} key - The key of the array element
     * @param {*} val - The value to push
     * @param {string} [path=null] - The path to the property to modify inside the value. Can be a dot-separated path, such as "prop1.subprop2.subprop3"
     * @param {boolean} [force=false] - If true and if the element you try to modify is NOT an array, throw an error
     * @returns {Promise<void>} A promise
     */
    async push(key, val, path, force = false) {
        this[_readyCheck]();

        if (_.isNil(key)) throw new Err("key is null or undefined");

        if (!this[_typeCheck](key)) key = key.toString();

        if (_.isNil(val)) throw new Err("val is null or undefined");

        const find = await this.base.findOne({ _id: key }) || { value: null };

        if (path) {
            if (!_.isArray(_.get(find.value, path, [])) && force) throw new Err("The element you tried to modify is not an array");
            const data = _.get(find.value, path, []);

            data.push(val);

            val = _.set(find.value, path, data);
        } else {
            if (!_.isArray(find.value) && force) throw new Err("The element you tried to modify is not an array");
            const data = _.isArray(find.value) ? find.value : [];

            data.push(val);

            val = data;
        }

        await this.base.updateOne({ _id: key }, { $set: { _id: key, value: val } }, { upsert: true });
    }

    /**
     * @async
     * @since 1.0.0
     * @description Finds a document in the database
     * @param {*} key - The key of the document to get
     * @param {string} [path=null] - The path to the property to modify inside the value. Can be a dot-separated path, such as "prop1.subprop2.subprop3"
     * @param {boolean} [raw=false] - If true, the method returns a promise containing the full object, i.e. : { _id: "foo", value: "bar" }
     * @returns {Promise<*>} If raw is false : a promise containing the value found in the database for this key.
     */
    async get(key, path, raw = false) {
        this[_readyCheck]();

        if (_.isNil(key)) return null;

        if (!this[_typeCheck](key)) key = key.toString();

        const find = await this.base.findOne({ _id: key });
        if (_.isNil(find)) return null;

        const data = find.value;
        if (_.isNil(data)) return null;

        if (raw) {
            return find;
        }

        if (path) {
            return _.get(data, path);
        } else {
            return data;
        }
    }

    /**
     * @async
     * @since 1.0.0
     * @description Checks if a document exists
     * @param {*} key - The key of the document to check
     * @param {string} [path=null] - The path to the property to check. Can be a dot-separated path, such as "prop1.subprop2.subprop3"
     * @returns {Promise<boolean>} A promise
     */
    async has(key, path) {
        this[_readyCheck]();

        if (!this[_typeCheck](key)) key = key.toString();

        const find = await this.base.findOne({ _id: key });
        if (_.isNil(find)) return false;

        const data = find.value;
        if (_.isNil(data)) return false;

        if (path) {
            return _.has(data, path);
        }

        return true;
    }

    /**
     * @async
     * @since 1.0.0
     * @description If the document doesn't exist : creates and returns it, else returns it
     * @param {*} key - The key to check if it exists or to set a document or a property inside the value
     * @param {*} val - The value to set if the key doesn't exist
     * @param {string} [path=null] - The path to the property to check. Can be a dot-separated path, such as "prop1.subprop2.subprop3"
     * @param {boolean} [raw=false] - If true, the method returns a promise containing the full object, i.e. : { _id: "foo", value: "bar" }
     * @returns {Promise<*>} If raw is false : a promise containing the value found in the database for this key.
     */
    async ensure(key, val, path, raw = false) {
        this[_readyCheck]();

        if (_.isNil(key)) throw new Err("key is null or undefined");
        if (_.isNil(val)) throw new Err("val is null or undefined");

        if (await this.has(key, path) === false) {
            await this.set(key, val, path);
        }

        return await this.get(key, path, raw);
    }

    // This method was mostly taken from Enmap... Licence : https://github.com/eslachance/enmap/blob/master/LICENSE
    /**
     * @async
     * @since 1.0.0
     * @description Deletes a document in the database
     * @param {*} key - The key
     * @param {string} [path=null] - The path to the property to delete. Can be a dot-separated path, such as "prop1.subprop2.subprop3"
     * @returns {Promise<void>} A promise
     */
    async delete(key, path) {
        this[_readyCheck]();

        if (_.isNil(key)) throw new Err("key is null or undefined");

        if (!this[_typeCheck](key)) key = key.toString();

        if (_.isNil(val)) throw new Err("val is null or undefined");

        if (path) {
            const find = await this.base.findOne({ _id: key });
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

            await this.base.updateOne({ _id: key }, { $set: { _id: key, value: data } }, { upsert: true });
        } else {
            await this.base.deleteOne({ _id: key }, { single: true });
        }
    }

    /**
     * @async
     * @since 1.0.0
     * @description Deletes all the documents
     * @returns {Promise<void>} A promise
     */
    async clear() {
        this[_readyCheck]();

        await this.base.deleteMany({});
    }

    /**
     * @since 1.0.0
     * @returns {Array<*>} An array with the values of all the documents
     */
    valueArray() { return this.base.find({}).map(d => d.value).toArray(); }

    /**
     * @since 1.0.0
     * @returns {Array<*>} An array with the keys of all the documents
     */
    keyArray() { return this.base.find({}).map(d => d._id).toArray(); }

    /**
     * @since 1.0.0
     * @returns {Array<Object<*>>} An array with all the documents of the database
     */
    rawArray() { return this.base.find({}).toArray(); }

    /**
    * @async
    * @since 1.0.0
    * @param {boolean} [fast=false] - Set to true if you don't need precise size & if your database is very big
    * @returns {Promise<number>} A promise containing the size of the database
    */
    async size(fast = false) {
        if (fast) {
            return this.base.estimatedDocumentCount();
        } else {
            return this.base.countDocuments();
        }
    }

}

module.exports = Piece;
