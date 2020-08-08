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

	public db!: Db;
	public table!: Table;

	constructor(public options: ProviderOptions) {
		["dbName", "tableName"].forEach((prop) => {
			if (!options[prop] || options[prop] !== "string") {
				throw new Error(`\`options.${prop}\` should be a string`);
			}
		});

		this.defer = new Promise((res) => {
			this.resolveDefer = res;
		});
	}

	public async connect(): Promise<void> {
		const { username, password, port, host, dbName, tableName } = this.options;
		this.conn = await connect({ user: username, password, port, host, db: dbName });

		if (!(await r.dbList().run(this.conn)).includes(dbName)) {
			await r.dbCreate(dbName).run(this.conn);
		}

		this.conn.use(dbName);

		this.db = r.db(dbName);

		if (!(await this.db.tableList().run(this.conn)).includes(tableName)) {
			await this.db.tableCreate(tableName).run(this.conn);
		}

		this.table = this.db.table(tableName);
	}

	public async close(): Promise<void> {
		await this.conn.close();
	}

	public size(): Promise<number> {
		return this.table.count().run(this.conn);
	}

	public async clear(): Promise<void> {
		await this.table.delete().run(this.conn);
	}

	public async delete(key: TKey): Promise<boolean> {
		return (
			(
				await this.table
					.get((key as unknown) as string)
					.delete()
					.run(this.conn)
			).deleted > 0
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public async fetchAll(): Promise<any[]> {
		return (await this.table.run(this.conn)).toArray();
	}
}
