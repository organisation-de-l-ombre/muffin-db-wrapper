/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoClient, Db, Collection } from "mongodb";

export function isUndefined(something: any) {
	return something === undefined;
}

export interface ProviderOptions {
	username?: string;
	password?: string;
	port?: number;
	host?: string;

	url?: string;

	dbName: string;
	collectionName: string;
}

export class MongoProvider {
	public conn: MongoClient;

	public isReady = false;
	public isClosed = false;

	public resolveDefer: () => void;
	public defer: Promise<void>;

	public db: Db;
	public coll: Collection<{ _id: any; value: any }>;

	constructor(public options: ProviderOptions) {
		["dbName", "collectionName"].forEach((prop) => {
			if (!options[prop] || typeof options[prop] !== "string") {
				throw new Error(`\`options.${prop}\` should be a string`);
			}
		});

		const credentials =
			options.username && options.password
				? `${options.username}:${options.password}@`
				: "";
		options.port = options.port || 27017;
		options.host = options.host || "localhost";

		const url =
			options.url ||
			`mongodb+srv://${credentials}${options.host}:${options.port}/?retryWrites=true&w=majority`;

		this.conn = new MongoClient(url, { useNewUrlParser: true });
		this.db = this.conn.db(options.dbName);
		this.coll = this.db.collection(options.collectionName);

		this.defer = new Promise((res) => {
			this.resolveDefer = res;
		});
	}

	public async connect(): Promise<void> {
		await this.conn.connect();
	}

	public async close(): Promise<void> {
		await this.conn.close();
	}

	public size(): Promise<number> {
		return this.coll.countDocuments();
	}

	public async clear(): Promise<void> {
		await this.coll.deleteMany({});
	}

	public async delete(key: any): Promise<boolean> {
		return (await this.coll.deleteOne({ _id: key })).deletedCount > 0;
	}

	public async entryArray(): Promise<[any, any][]> {
		return (await this.fetchAll()).map(({ _id, value }) => [_id, value]);
	}

	public fetch(key: any): Promise<any> {
		return this.coll.findOne({ _id: key });
	}

	public async has(key: any): Promise<boolean> {
		return !isUndefined(await this.coll.findOne({ _id: key }));
	}

	private fetchAll(): Promise<{ _id: any; value: any }[]> {
		return this.coll.find({}).toArray();
	}

	public async keyArray(): Promise<any[]> {
		return (await this.fetchAll()).map(({ _id }) => _id);
	}

	public async set(key: any, value: any): Promise<void> {
		await this.coll.updateOne({ _id: key }, { $set: { value: value } }, { upsert: true });
	}

	public async valueArray(): Promise<any[]> {
		return (await this.fetchAll()).map(({ value }) => value);
	}
}

export default MongoClient;
