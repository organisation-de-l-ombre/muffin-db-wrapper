/* eslint-disable no-useless-constructor */
import r, { connect, Connection, Db, Table } from "rethinkdb";

export interface ProviderOptions {
	username?: string;
	password?: string;
	port?: number;
	host?: string;

	dbName: string;
	tableName: string;
}

export default class RethinkProvider<TKey, TValue> {
	public conn!: Connection;

	public isReady = false;
	public isClosed = false;

	public resolveDefer: () => void;
	public defer: Promise<void>;

	public db: Db;
	public table!: Table;

	constructor(public options: ProviderOptions) {
		["dbName", "tableName"].forEach((prop) => {
			if (!options[prop] || options[prop] !== "string") {
				throw new Error(`\`options.${prop}\` should be a string`);
			}
		});

		this.db = r.db(options.dbName);

		this.defer = new Promise((res) => {
			this.resolveDefer = res;
		});
	}

	public async connect(): Promise<void> {
		const { username: user, password, port, host, dbName: db } = this.options;
		this.conn = await connect({ user, password, port, host, db });

		if ((await r.dbList().run(this.conn)).includes(db)) {
			await r.dbCreate(db).run(this.conn);
		}
	}
}
