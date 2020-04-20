const _ = require("lodash");
const Err = require("./MuffinError");

const _readyCheck = Symbol("readyCheck");
const _typeCheck = Symbol("typeCheck");

class Piece {

    /**
     * @namespace
     * @class
     * @protected
     * @classdesc An object similar to Map that has an optional cache, used to interact with the database.
     * @description Initialize a new Piece.
     * @since 1.0
     * @param {Collection} base - The [Collection]{@link https://mongodb.github.io/node-mongodb-native/3.3/api/Collection.html} from MongoDB.
     * @param {MuffinClient} client - The client that instantiated the Piece.
     * @param {PieceOptions} options - Options like cache or fetchAll.
     */
    constructor(base, client, { cache, fetchAll }) {
        /**
         * @since 1.0
         * @member {Collection} - The collection wrapped by the piece.
         */
        this.base = base;

        /**
         * @since 1.0
         * @member {MuffinClient} - The client that instantiated the Piece.
         */
        this.client = client;

        if (cache) {
            /**
             * @since 1.2
             * @member {boolean} - If set to true, the cache is available.
             */
            this.hasCache = true;

            /**
             * @since 1.2
             * @member {Map} - An optional cache, it can be useful but it can also uses a lot of ram.
             */
            this.cache = new Map();

            if (fetchAll) {
                this.base.find({}).map(d => { this.cache.set(d._id, d.value); });
            }
        } else {
            this.hasCache = false;
        }
    }

    [_readyCheck]() {
        if (this.client.isClosed) throw new Err("the database has been closed", "MuffinClosedError");
    }

    [_typeCheck](key) {
        return ["Number", "String", "Object"].includes(key.constructor.name);
    }

    /**
     * @async
     * @description Sets a document into the database.
     * @since 1.0
     * @param {*} key - The key of the document to set.
     * @param {*} val - The value of the document to set into the database.
     * @param {string} [path=null] - The path to the property to modify inside the value. Can be a dot-separated path, such as "prop1.subprop2.subprop3".
     * @returns {Promise<void>} A promise
     */
    async set(key, val, path) {
        this[_readyCheck]();

        if (_.isNil(key)) throw new Err("key is null or undefined");

        if (!this[_typeCheck](key)) key = key.toString();

        if (_.isNil(val)) throw new Err("val is null or undefined");

        if (path) {
            let rawData;

            if (this.hasCache) {
                if (this.cache.has(key)) {
                    rawData = { value: this.cache.get(key) };
                } else {
                    rawData = await this.base.findOne({ _id: key });
                }
            } else {
                rawData = await this.base.findOne({ _id: key });
            }

            val = _.set(rawData.value || {}, path, val);
        }

        if (this.hasCache) this.cache.set(key, val);
        await this.base.updateOne({ _id: key }, { $set: { _id: key, value: val } }, { upsert: true });
    }

    /**
     * @async
     * @description Push to an array value.
     * @since 1.2
     * @param {*} key - The key of the document.
     * @param {*} val - The value to push.
     * @param {string} [path=null] - Optional. The path to the property to modify inside the element. Can be a dot-separated path, such as "prop1.subprop2.subprop3".
     * @param {boolean} [allowDupes=false] - Optional. Allow duplicate values in the array.
     * @returns {Promise<void>} A promise
     */
    async push(key, val, path, allowDupes = false) {
        this[_readyCheck]();

        if (_.isNil(key)) throw new Err("key is null or undefined");

        if (!this[_typeCheck](key)) key = key.toString();

        if (_.isNil(val)) throw new Err("val is null or undefined");

        let rawData;

        if (this.hasCache) {
            if (this.cache.has(key)) {
                rawData = { value: this.cache.get(key) };
            } else {
                rawData = await this.base.findOne({ _id: key });
            }
        } else {
            rawData = await this.base.findOne({ _id: key });
        }

        if (_.isNil(rawData) || _.isNil(rawData.value)) rawData = { value: [] };

        let data;
        let finalData;

        if (path) {
            if (!_.isArray(_.get(rawData.value, path))) throw new Err("The element you tried to modify is not an array");
            data = _.isArray(_.get(rawData.value, path)) ? rawData.value : [];

            if (data.indexOf(val) > -1 && !allowDupes) {
                if (!this.cache.has(key)) this.cache.set(key, finalData);

                return;
            }

            data.push(val);

            finalData = _.set(rawData.value, path, data);
        } else {
            if (!_.isArray(rawData.value)) throw new Err("The element you tried to modify is not an array");
            data = _.isArray(rawData.value) ? rawData.value : [];

            if (data.indexOf(val) > -1 && !allowDupes) {
                if (!this.cache.has(key)) this.cache.set(key, finalData);

                return;
            }

            data.push(val);

            finalData = data;
        }

        if (this.hasCache) this.cache.set(key, finalData);

        await this.base.updateOne({ _id: key }, { $set: { _id: key, value: finalData } }, { upsert: true });
    }

    /**
     * @async
     * @description Gets a document in the database.
     * @since 1.0
     * @param {*} key - The key of the document to get.
     * @param {string} [path=null] - Optional. The path to the property to take inside the value. Can be a dot-separated path, such as "prop1.subprop2.subprop3".
     * @param {boolean} [raw=false] - Optional. Returns the full object, i.e. : { _id: "foo", value: "bar" }.
     * @returns {Promise<*>} If raw is set to false, returns the value found in the database for this key.
     */
    async get(key, path, raw = false) {
        this[_readyCheck]();

        if (_.isNil(key)) return null;

        if (!this[_typeCheck](key)) key = key.toString();

        let rawData;
        let data;

        try {
            if (this.hasCache) {
                if (this.cache.has(key)) {
                    rawData = { _id: key, value: this.cache.get(key) };
                } else {
                    rawData = await this.base.findOne({ _id: key });
                    this.cache.set(key, rawData.value);
                }
            } else {
                rawData = await this.base.findOne({ _id: key });
            }

            data = rawData.value;
        } catch (e) {
            return null;
        }

        if (_.isNil(data)) return null;

        if (raw && !this.hasCache) {
            return rawData;
        }

        if (path) {
            return _.get(data, path);
        } else {
            return data;
        }
    }

    /**
     * @async
     * @description Do not works if the cache is not activated. Update the cache with data from database.
     * @since 1.2
     * @param {*} key - The key of the document to get
     * @param {string} [path=null] - Optional. The path to the property to take inside the value. Can be a dot-separated path, such as "prop1.subprop2.subprop3".
     * @param {boolean} [raw=false] - Optional. Returns the full object, i.e. : { _id: "foo", value: "bar" }.
     * @returns {Promise<*>} If raw is set to false, returns the value found in the database for this key.
     */
    async fetch(key, path, raw = false) {
        this[_readyCheck]();

        if (!this.hasCache) throw new Err("The cache is not activated, you can't use this method");

        if (_.isNil(key)) return null;

        if (!this[_typeCheck](key)) key = key.toString();

        let rawData;
        let data;

        try {
            rawData = await this.base.findOne({ _id: key });

            data = rawData.value;
        } catch (e) {
            return null;
        }

        if (_.isNil(data)) return null;

        this.cache.set(key, data);

        if (raw) {
            return rawData;
        }

        if (path) {
            return _.get(data, path);
        } else {
            return data;
        }
    }

    /**
     * @since 1.2
     * @description Fetch all the database and caches it all. It also updates already cached data.
     * @returns {Promise<void>} Nothing
     */
    async fetchAll() {
        this[_readyCheck]();

        if (!this.hasCache) throw new Err("The cache is not activated, you can't use this method");

        await this.base.find({}).forEach(d => {
            this.cache.set(d._id, d.value);
        });
    }

    /**
     * @async
     * @description Checks if a document exists.
     * @since 1.0
     * @param {*} key - The key of the document to check.
     * @param {string} [path=null] - Optional. The path to the property to check. Can be a dot-separated path, such as "prop1.subprop2.subprop3".
     * @returns {Promise<boolean>} A promise
     */
    async has(key, path) {
        this[_readyCheck]();

        if (!this[_typeCheck](key)) key = key.toString();

        let rawData;

        if (this.hasCache) {
            if (this.cache.has(key)) {
                rawData = { value: this.cache.get(key) };
            } else {
                rawData = await this.base.findOne({ _id: key });
            }
        } else {
            rawData = await this.base.findOne({ _id: key });
        }
        if (_.isNil(rawData)) return false;

        const data = rawData.value;
        if (_.isNil(data)) return false;

        if (this.hasCache) this.cache.set(key, data);

        if (path) {
            return _.has(data, path);
        }

        return true;
    }

    /**
     * @async
     * @description If the document doesn't exist : creates it and returns it, if it does exist : returns it.
     * @since 1.0
     * @param {*} key - The key to check if it exists or to set a document or a property inside the value.
     * @param {*} val - The value to set if the key doesn't exist.
     * @param {string} [path=null] - Optional. The path to the property to ensure. Can be a dot-separated path, such as "prop1.subprop2.subprop3".
     * @param {boolean} [raw=false] - Optional. Returns the full object, i.e. : { _id: "foo", value: "bar" }.
     * @returns {Promise<*>} If raw is set to false, returns the value found in the database for this key.
     */
    async ensure(key, val, path, raw = false) {
        this[_readyCheck]();

        if (_.isNil(key)) throw new Err("key is null or undefined");
        if (_.isNil(val)) throw new Err("val is null or undefined");

        if (!await this.has(key, path)) {
            await this.set(key, val, path);
        }

        return this.get(key, path, raw);
    }

    // This method was mostly taken from Enmap (but it was modified)... Licence : https://github.com/eslachance/enmap/blob/master/LICENSE
    /**
     * @async
     * @description Deletes a document in the database.
     * @since 1.0
     * @param {*} key - The key.
     * @param {string} [path=null] - Optional. The path to the property to delete. Can be a dot-separated path, such as "prop1.subprop2.subprop3".
     * @returns {Promise<void>} A promise
     */
    async delete(key, path) {
        this[_readyCheck]();

        if (_.isNil(key)) throw new Err("key is null or undefined");

        if (!this[_typeCheck](key)) key = key.toString();

        if (path) {
            let rawData;

            if (this.hasCache) {
                if (this.cache.has(key)) {
                    rawData = { value: this.cache.get(key) };
                } else {
                    rawData = await this.base.findOne({ _id: key });
                }
            } else {
                rawData = await this.base.findOne({ _id: key });
            }

            let data = rawData.value;
            if (_.isNil(rawData) || _.isNil(data)) return;

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

            if (this.hasCache) this.cache.set(key, data);
            await this.base.updateOne({ _id: key }, { $set: { _id: key, value: data } }, { upsert: true });
        } else {
            if (this.hasCache) this.cache.delete(key);
            await this.base.deleteOne({ _id: key }, { single: true });
        }
    }

    /**
     * @description Do not works if the cache is not activated. Removes a cached element, it does not touch the real database.
     * @since 1.2
     * @param {*} key - The key.
     * @param {string} [path=null] - Optional. The path to the property to uncache. Can be a dot-separated path, such as "prop1.subprop2.subprop3".
     * @returns {void} - Nothing
     */
    evict(key, path) {
        this[_readyCheck]();

        if (!this.hasCache) throw new Err("The cache is not activated, you can't use this method");
        if (_.isNil(key)) throw new Err("key is null or undefined");

        if (!this[_typeCheck](key)) key = key.toString();

        if (path) {
            let data;

            if (this.cache.has(key)) {
                data = this.cache.get(key);
            } else {
                return;
            }

            if (_.isNil(data)) return;

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

            this.cache.set(key, data);
        } else {
            this.cache.delete(key);
        }
    }

    /**
     * @async
     * @description Deletes all the documents.
     * @since 1.0
     * @returns {Promise<void>} A promise
     */
    async clear() {
        this[_readyCheck]();

        if (this.hasCache) this.cache.clear();
        await this.base.deleteMany({});
    }

    /**
     * @description Do not works if the cache is not activated. Removes all the cached elements. It does not touch the real database.
     * @since 1.2
     * @returns {void} - Nothing
     */
    evictAll() {
        this[_readyCheck]();

        if (!this.hasCache) throw new Err("The cache is not activated, you can't use this method");

        this.cache.clear();
    }

    /**
     * @since 1.0
     * @async
     * @param {boolean} [cache=false] - Optional. If there is a [cache]{@link Piece~cache}, it takes the data from it.
     * @returns {Array<*>} A promise. When resolved, returns an array with the values of all the documents
     */
    async valueArray(cache = false) {
        this[_readyCheck]();

        if (this.hasCache && cache) {
            const values = [];

            for (const value of this.cache.values()) {
                values.push(value);
            }
            return values;
        } else {
            return this.base.find({}).map(d => d.value).toArray();
        }
    }

    /**
     * @since 1.0
     * @async
     * @param {boolean} [cache=false] - Optional. If there is a [cache]{@link Piece~cache}, it takes the data from it.
     * @returns {Promise<Array<*>>} A promise. When resolved, returns an array with the keys of all the documents
     */
    async keyArray(cache = false) {
        this[_readyCheck]();

        if (this.hasCache && cache) {
            const keys = [];

            for (const key of this.cache.keys()) {
                keys.push(key);
            }
            return keys;
        } else {
            return this.base.find({}).map(d => d._id).toArray();
        }
    }

    /**
     * @since 1.0
     * @async
     * @returns {Promise<Array<Object<*>>>} An array with all the documents of the database
     */
    async rawArray() {
        this[_readyCheck]();

        return this.base.find({}).toArray();
    }

    /**
    * @async
    * @since 1.0
    * @param {boolean} [fast=false] - Optional. Set to true if your database is very big (the size will be less precise but it will be faster).
    * @returns {Promise<number>} A promise returning the size of the database when resolved
    */
    async size(fast = false) {
        this[_readyCheck]();

        if (fast) {
            return this.base.estimatedDocumentCount();
        } else {
            return this.base.countDocuments();
        }
    }

}

module.exports = Piece;
