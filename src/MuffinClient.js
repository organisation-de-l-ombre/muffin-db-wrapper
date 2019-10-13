/* eslint-disable max-len */

const Err = require("./MuffinError");
const { MongoClient } = require("mongodb");
const EventEmitter = require("events");

const Piece = require("./Piece");

const _url = Symbol("url");
const _client = Symbol("client");
const _db = Symbol("db");
const _readyCheck = Symbol("readyCheck");
const _ready = Symbol("ready");
const _readyFailed = Symbol("readyFailed");

class MuffinClient extends EventEmitter {

    /**
     * @typedef {Object} MuffinOptions
     * @property {string} [username]
     * @property {string} [password]
     * @property {number} [port=27017]
     * @property {string} [host="localhost"]
     * @property {string} [dbName="muffin"]
     * @property {string} [url]
     */
    /**
     *
     * @class
     * @public
     * @classdesc Use the [MongoDB official Driver]{@link https://www.npmjs.com/package/mongodb} to provide pieces, they are map-like objects
     * @param {MuffinOptions} options - If you use url you don't need to use username, password, port and host
     */
    constructor(options = {}) {
        super();

        this.defer = new Promise((res, rej) => {
            this[_ready] = res;
            this[_readyFailed] = rej;
        });

        this.dbName = options.dbName || "muffin";
        this[_url] = options.url || `mongodb://${options.username}:${options.password}@${options.host || "localhost"}:${options.port || 27017}/${this.dbName}`;
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
                this[_readyFailed](e);
            }
        })();
    }

    [_readyCheck]() {
        if (this.isReady === false) throw new Err("the database is not ready", "MuffinReadyError");
        if (this.closed === true) throw new Err("the database has been closed", "MuffinClosedError");
    }

    /**
     * @description Create many pieces
     * @param {Array<string>} names - Names of the pieces
     * @returns {Object<Piece>} An object with the pieces you created. [Destructuring]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment} can be useful !
     */
    multi(names = []) {
        this[_readyCheck]();

        const colls = {};

        names.map(val => {
            colls[val] = this.piece(val);
        });

        return colls;
    }

    /**
     * @description Create a {@link Piece} to interact with MongoDB
     * @param {string} name - The piece's name
     * @returns {Piece} A {@link Piece}
     */
    piece(name) {
        this[_readyCheck]();

        return new Piece(this[_db].collection(name), this);
    }

    /**
     * @description Close the database
     * @returns {void} Nothing
     */
    close() {
        this[_readyCheck]();

        this[_client].close();
        this.closed = true;
    }

}

module.exports = MuffinClient;
