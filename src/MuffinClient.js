/* eslint-disable max-len */
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
 * @typedef {Object} MongoError {@link https://mongodb.github.io/node-mongodb-native/3.3/api/MongoError.html}
 */

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
     * @class
     * @public
     * @extends EventEmitter
     * @classdesc Use the [MongoDB official Driver]{@link https://www.npmjs.com/package/mongodb} and allows you to create pieces, which are map-like objects (without cache)
     * @param {MuffinOptions} options - Options for the client
    */

    constructor(options = {}) {
        super();

        /**
         * @member {Promise} - Resolved when the database is ready
         */
        this.defer = new Promise((res, rej) => {
            this[_ready] = res;
            this[_readyFailed] = rej;
        });

        /**
         * @member {string} - Name of the database, Muffin by default
         */
        this.dbName = options.dbName || "muffin";
        this[_url] = options.url || `mongodb://${options.username}:${options.password}@${options.host || "localhost"}:${options.port || 27017}/${this.dbName}`;

        /**
         * @member {boolean} - True when the database is ready
         */
        this.isReady = false;

        /**
         * @member {boolean} - True if the database is closed
         */
        this.closed = false;

        (async () => {
            try {
                this[_client] = await MongoClient.connect(this[_url], { useNewUrlParser: true, useUnifiedTopology: true });
                this[_db] = this[_client].db(this.dbName);

                this.isReady = true;
                this[_ready]();

                /**
                 * @event MuffinClient#close
                 * @description Emitted after a socket closed against a single server or mongos proxy.
                 * @type {MongoError}
                 */
                this[_db].on("close", () => {
                    this.emit("close");
                });

                /**
                 * @event MuffinClient#reconnect
                 * @type {Object}
                 */
                this[_db].on("reconnect", object => {
                    this.emit("reconnect", object);
                });

                /**
                 * @event MuffinClient#timeout
                 * @description Emitted after a socket timeout occurred against a single server or mongos proxy.
                 * @type {MongoError}
                 */
                this[_db].on("timeout", err => {
                    this.emit("timeout", err);
                });

                /**
                 * @event MuffinClient#change
                 * @description Emit when a change occurs on the database
                 * @type {Object}
                 */
                this[_db].watch().on("change", obj =>
                    this.emit("change", obj));
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

        return names.map(val => this.piece(val));
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
