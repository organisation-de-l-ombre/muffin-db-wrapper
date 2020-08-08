/* eslint-disable no-useless-constructor */
import { connect, Connection, Db, Table } from "rethinkdb";

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

	public db!: Db;
	public table!: Table;

	constructor(public options: ProviderOptions) {
		["dbName", "tableName"].forEach((prop) => {
			if (!options[prop] || options[prop] !== "string") {
				throw new Error(`\`options.${prop}\` should be a string`);
			}
		});
	}

	public async connect(): Promise<void> {
		const { username: user, password, port, host } = this.options;
		this.conn = await connect({ user, password, port, host, db: this.options.dbName });
	}
}
