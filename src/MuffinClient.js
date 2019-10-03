const Err = require("./MuffinError");
const { MongoClient } = require("mongodb");
const EventEmitter = require("events");

const Collection = require("./Collection");

const _url = Symbol("url");
const _client = Symbol("client");
const _db = Symbol("db");
const _readyCheck = Symbol("readyCheck");
const _ready = Symbol("ready");

class MuffinClient extends EventEmitter {

    constructor(options) {
        super();

        // eslint-disable-next-line no-unused-vars
        this.defer = new Promise((res, rej) => {
            this[_ready] = res;
        });

        if (!options.url) {
            throw new Err("You must provide options.url");
        }

        if (!options.dbName) {
            throw new Err("You must provide options.dbName");
        }

        this[_url] = options.url;
        this.dbName = options.dbName;
        this.isReady = false;
        this.closed = false;
        this.destroyed = false;

        (async () => {
            try {
                this[_client] = await MongoClient.connect(this[_url], { useNewUrlParser: true, useUnifiedTopology: true });
                this[_db] = this[_client].db(this.dbName);

                this.isReady = true;
                this[_ready]();
            } catch (e) {
                console.error(e);
            }
        })();
    }

    [_readyCheck]() {
        if (this.isReady === false) throw new Err("the database is not ready", "MuffinReadyError");
        if (this.closed === true) throw new Err("the database has been closed", "MuffinClosedError");
    }

    multi(names = []) {
        this[_readyCheck]();

        const colls = {};

        names.map(val => {
            colls[val] = this.collection(val);
        });

        return colls;
    }

    collection(name) {
        this[_readyCheck]();

        return new Collection(this[_db].collection(name));
    }

}

module.exports = MuffinClient;
