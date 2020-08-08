/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoClient, Db, Collection } from "mongodb";

export function isNullOrUndefined(something: any) {
	return something === null || something === undefined;
}

interface ProviderOptions {
	username?: string;
	password?: string;
	port?: string | number;
	host?: string;

	url?: string;

	dbName: string;
	collectionName: string;
}

export default class MongoProvider<TKey, TValue> {
	public conn: MongoClient;

	public isReady = false;
	public isClosed = false;

	public resolveDefer: () => void;
	public defer: Promise<void>;

	public db: Db;
	public coll: Collection<{ _id: TKey; value: TValue }>;

	constructor(public options: ProviderOptions) {
		const credentials =
			options.username && options.password ? `${options.username}:${options.password}@` : "";
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
		await this.coll.drop();
	}

	public async delete(key: TKey): Promise<boolean> {
		return (await this.coll.deleteOne({ _id: key })).deletedCount > 0;
	}

	public async entryArray(): Promise<[TKey, TValue][]> {
		return (await this.fetchAll()).map(({ _id, value }) => [_id, value]);
	}

	public fetch(key: TKey): Promise<TValue> {
		return this.coll.findOne({ _id: key });
	}

	public async has(key: TKey): Promise<boolean> {
		return !isNullOrUndefined(await this.coll.findOne(key));
	}

	private fetchAll(): Promise<{ _id: TKey; value: TValue }[]> {
		return this.coll.find({}).toArray();
	}

	public async keyArray(): Promise<TKey[]> {
		return (await this.fetchAll()).map(({ _id }) => _id);
	}

	public async set(key: TKey, value: TValue): Promise<void> {
		await this.coll.updateOne({ _id: key }, { $set: { value: value } }, { upsert: true });
	}

	public async valueArray(): Promise<TValue[]> {
		return (await this.fetchAll()).map(({ value }) => value);
	}
}
