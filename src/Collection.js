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

    get(key, path) {
        [_readyCheck]();

        if (_.isNil(key)) return null;

        if (!_.isNil(path)) {
            const cachedData = this.cache.get(key);

            if (_.has(cachedData, path)) {
                return _.get(cachedData, path);
            } else {
                this.base.find()
            }
        }
    }

}

module.exports = Collection;
