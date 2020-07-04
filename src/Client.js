/* eslint-disable max-len */

/**
 * @typedef {Object} ClientOptions
 * @description If you use url you don't need to use username, password, port and host
 * @property {string} [username]            - Not used if an url is provided
 * @property {string} [password]            - Not used if an url is provided
 * @property {number} [port=27017]          - Not used if an url is provided
 * @property {string} [host="localhost"]    - Not used if an url is provided
 * @property {string} [dbName="muffin"]     - The name of the database on the Mongo server
 * @property {string} [url]
 */

/**
 * @typedef {Object} PieceOptions
 * @description If you use url you don't need to use username, password, port and host.
 * @property {boolean} [fetchAll=false] - Default to false. Caches all the database.
 * @since 1.4
 * @property {boolean} [autoCacheSync=true] - Default to true. Makes the cache sync itself with the Mongo server.
 */

/**
 * @typedef {any} MongoError {@link https://mongodb.github.io/node-mongodb-native/3.3/api/MongoError.html}
 */

const { MongoClient } = require("mongodb"),
	EventEmitter = require("events");

const Piece = require("./Piece"),
	Err = require("./MuffinError");

const _url = Symbol("url"),
	_client = Symbol("client"),
	_db = Symbol("db"),
	_readyCheck = Symbol("readyCheck"),
	_ready = Symbol("ready"),
	_readyFailed = Symbol("readyFailed"),
	_deprecatedChangeEvent = require("util").deprecate((client, obj) => {
		client.emit("change", obj);
	}, "MuffinDB : Please consider using Piece's change event instead of Client's change event.");

class Client extends EventEmitter {
	/**
	 * Use the [MongoDB official Driver]{@link https://www.npmjs.com/package/mongodb} and allows you to create pieces, which are map-like objects. (with an optional cache)
	 * @constructor
	 * @public
	 * @since 1.0
	 * @extends EventEmitter
	 * @param {ClientOptions} options - Options for the client.
	 */
	constructor(options = {}) {
		super();

		/**
		 * @since 1.0
		 * @member {Promise<void>} - Resolved when the database is ready.
		 */
		this.defer = new Promise((res, rej) => {
			try {
				if (this.isReady) {
					res();
				}

				this[_ready] = res;
				this[_readyFailed] = rej;
			} catch (error) {
				rej(error);
			}
		});

		/**
		 * @since 1.0
		 * @member {string} - Name of the database, Muffin by default.
		 */
		this.dbName = options.dbName || "muffin";
		this[_url] =
			options.url ||
			`mongodb://${options.username}:${options.password}@${options.host || "localhost"}:${
				options.port || 27017
			}/${this.dbName}`;

		/**
		 * @since 1.0
		 * @member {boolean} - True when the database is ready.
		 */
		this.isReady = false;

		/**
		 * @since 1.0
		 * @member {boolean} - True if the database is closed.
		 */
		this.closed = false;

		(async () => {
			try {
				this[_client] = await MongoClient.connect(this[_url], {
					useNewUrlParser: true,
					useUnifiedTopology: true,
				});
				this[_db] = this[_client].db(this.dbName);

				this.isReady = true;
				this[_ready]();

				/**
				 * @event Client#close
				 * @since 1.0
				 * @description Emitted after a socket closed against a single server or mongos proxy.
				 */
				this[_db].on("close", () => {
					this.emit("close");
				});

				/**
				 * @event Client#reconnect
				 * @since 1.0
				 * @type {any}
				 */
				this[_db].on("reconnect", (object) => {
					this.emit("reconnect", object);
				});

				/**
				 * @event Client#timeout
				 * @since 1.0
				 * @description Emitted after a socket timeout occurred against a single server or mongos proxy.
				 * @type {MongoError}
				 */
				this[_db].on("timeout", (err) => {
					this.emit("timeout", err);
				});

				/**
				 * @event Client#change
				 * @deprecated
				 * @since 1.1
				 * @description Emit when a change occurs on the database.
				 * @type {any}
				 */
				this[_db].watch(null, { fullDocument: "updateLookup" }).on("change", (obj) => {
					if (this.listenerCount("change") !== 0) {
						_deprecatedChangeEvent(this, obj);
					}
				});
			} catch (e) {
				this[_readyFailed](e);
			}
		})();
	}

	[_readyCheck]() {
		if (!this.isReady) {
			throw new Err("the database is not ready", "MuffinReadyError");
		}
		if (this.closed) {
			throw new Err("the database has been closed", "MuffinClosedError");
		}
	}

	/**
	 * @description Creates multiple pieces.
	 * @since 1.0
	 * @param {Array<string>} names - Names of the pieces.
	 * @param {PieceOptions} options - Options like cache or fetchAll.
	 * @returns {Object<Piece>} An object with the pieces. [Destructuring]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment} can be useful !
	 * @example
	 * const Muffin = require("muffindb");
	 * // MuffinOptions is a placeholder for... muffin options
	 * const client = new Muffin.Client(MuffinOptions);
	 *
	 * // This will returns an object with pieces inside
	 * // Theses pieces will have a cache because of fetchAll
	 * // fetchAll will make the pieces fetch all the data and caches them
	 * // Their cache will be synchronized with the database
	 * const pieces = client.multi(["a piece", "another piece", "third piece"], { fetchAll: true })
	 */
	multi(names = [], options) {
		this[_readyCheck]();

		const pieces = {};

		// eslint-disable-next-line array-callback-return
		names.map((val) => {
			pieces[val] = this.piece(val, options);
		});

		return pieces;
	}

	/**
	 * @description Creates a {@link Piece} to interact with MongoDB.
	 * @since 1.0
	 * @param {string} name - The piece's name.
	 * @param {PieceOptions} options - Options like cache or fetchAll.
	 * @returns {Piece} A {@link Piece} with the given name
	 * @example
	 * const Muffin = require("muffindb");
	 * // MuffinOptions is a placeholder for... muffin options
	 * const client = new Muffin.Client(MuffinOptions);
	 *
	 * // These piece will have a cache because of fetchAll and cacheSyncAuto
	 * // fetchAll will make the piece fetch all the data and caches them
	 * // Their cache will be synchronized with the database
	 * const piece = client.piece("a piece", { fetchAll: true, cacheSyncAuto: true })
	 */
	piece(name, options) {
		this[_readyCheck]();

		return new Piece(this[_db].collection(name), this, options);
	}

	/**
	 * @description Close the database.
	 * @since 1.0
	 * @returns {void} Nothing
	 */
	close() {
		this[_readyCheck]();

		this[_client].close();
		this.closed = true;
		this.isReady = false;
	}
}

module.exports = Client;
