/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import r, { connect, Connection, Db, Table } from "rethinkdb";

export function isUndefined(something: any): boolean {
	return something === undefined;
}

export interface ProviderOptions {
	username?: string;
	password?: string;
	port?: number;
	host?: string;

	dbName: string;
	tableName: string;
}

export class RethinkProvider<TKey, TValue> {
	public conn!: Connection;

	public isReady = false;
	public isClosed = false;

	public resolveDefer: () => void;
	public defer: Promise<void>;

	public db!: Db;
	public table!: Table;

	constructor(public options: ProviderOptions) {
		["dbName", "tableName"].forEach((prop) => {
			if (!options[prop] || typeof options[prop] !== "string") {
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

	public async delete(key: string): Promise<boolean> {
		return (await this.table.get(key).delete().run(this.conn)).deleted > 0;
	}

	public async entryArray(): Promise<[TKey, TValue][]> {
		return (await this.fetchAll()).map(({ id, value }) => [id, value]);
	}

	public async fetch(key: string): Promise<TValue> {
		return ((await this.table.get(key).run(this.conn)) as { id: TKey; value: TValue })
			.value;
	}

	public async has(key: string): Promise<boolean> {
		return !isUndefined(await this.table.get(key).run(this.conn));
	}

	public async fetchAll(): Promise<{ id: TKey; value: TValue }[]> {
		return (await this.table.run(this.conn)).toArray();
	}

	public async keyArray(): Promise<TKey[]> {
		return (await this.fetchAll()).map(({ id }) => id);
	}

	public async set(key: TKey, value: TValue): Promise<void> {
		await this.table.insert({ id: key, value }, { conflict: "replace" }).run(this.conn);
	}

	public async valueArray(): Promise<TValue[]> {
		return (await this.fetchAll()).map(({ value }) => value);
	}
}

export default RethinkProvider;
