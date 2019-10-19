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
     * @description If you use url you don't need to use username, password, port and host
     * @property {string} [username]            - Not used if an url is provided
     * @property {string} [password]            - Not used if an url is provided
     * @property {number} [port=27017]          - Not used if an url is provided
     * @property {string} [host="localhost"]    - Not used if an url is provided
     * @property {string} [dbName="muffin"]     - The name of the database on the Mongo server
     * @property {string} [url]
     */
    /**
     *
     * @class
     * @public
     * @classdesc Use the [MongoDB official Driver]{@link https://www.npmjs.com/package/mongodb} and allows you to create pieces, which are map-like objects (without cache)
     * @param {MuffinOptions} options - Options for the client
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
     * @description Creates multiple pieces
     * @param {Array<string>} names - Names of the pieces
     * @returns {Object<Piece>} An object with the pieces. [Destructuring]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment} can be useful !
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
     * @description Creates a {@link Piece} to interact with MongoDB
     * @param {string} name - The piece's name
     * @returns {Piece} A {@link Piece} with the given name
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
