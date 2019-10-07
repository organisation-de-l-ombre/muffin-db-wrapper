const Err = require("./MuffinError");
const { MongoClient } = require("mongodb");
const EventEmitter = require("events");

const Muffin = require("./Muffin");

const _url = Symbol("url");
const _client = Symbol("client");
const _db = Symbol("db");
const _readyCheck = Symbol("readyCheck");
const _ready = Symbol("ready");

class MuffinClient extends EventEmitter {

    constructor(options = {
        username: "",
        password: "",
        port: 27017,
        host: "localhost",
        dbName: "muffin",
        url: null
    }) {
        super();

        // eslint-disable-next-line no-unused-vars
        this.defer = new Promise((res, rej) => {
            this[_ready] = res;
        });

        if (!options.dbName) {
            throw new Err("You must provide options.dbName");
        }

        this[_url] = options.url || `mongodb://${options.username}:${options.password}@${options.host}:${options.port}/${options.dbName}`;
        this.dbName = options.dbName;
        this.isReady = false;
        this.closed = false;

        (async () => {
            try {
                this[_client] = await MongoClient.connect(this[_url], { useNewUrlParser: true, useUnifiedTopology: true });
                this[_db] = this[_client].db(this.dbName);

                this.isReady = true;
                this[_ready]();

                this[_db].on("close", () => {
                    this.emit("close");
                });

                this[_db].on("reconnect", object => {
                    this.emit("reconnect", object);
                });

                this[_db].on("timeout", err => {
                    this.emit("timeout", err);
                });

                this[_db].on("parseError", err => {
                    this.emit("parseError", err);
                });
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

    muffin(name) {
        this[_readyCheck]();

        return new Muffin(this[_db].collection(name), this);
    }

    close() {
        this[_readyCheck]();

        this[_client].close();
        this.closed = true;
    }

}

module.exports = MuffinClient;
