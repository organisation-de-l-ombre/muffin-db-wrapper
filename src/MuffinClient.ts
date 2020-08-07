/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable require-await */

import MuffinError from "./MuffinError";

export interface BaseProvider<TKey, TValue> {
	databaseClient: any;

	isReady: boolean;
	isClosed: boolean;

	resolveDefer: () => void;
	defer: Promise<void>;

	connect: () => Promise<void>;
	close: () => Promise<void>;

	size: () => Promise<number>;
	clear: () => Promise<void>;
	delete: (key: TKey) => Promise<boolean>;
	entryArray: () => Promise<[TKey, TValue][]>;
	fetch: (key: TKey) => Promise<TValue>;
	fetchAll: () => Promise<[TKey, TValue][]>;
	has: (key: TKey) => Promise<boolean>;
	keyArray: () => Promise<TKey[]>;
	set: (key: TKey, value: TValue) => Promise<void>;
	valueArray: () => Promise<TValue[]>;
}

export interface ClientOptions<TKey, TValue, TProvider extends BaseProvider<TKey, TValue>> {
	provider: TProvider;
	useCache: boolean;
	fetchAll: boolean;
}

// Todo: Methods like get, set etc... but with a path parameter
export class MuffinClient<
	TKey,
	TValue,
	TProvider extends BaseProvider<TKey, TValue> = BaseProvider<TKey, TValue>
> {
	public provider: TProvider;
	public cache?: Map<TKey, TValue>;

	public useCache: boolean;

	constructor(public options: ClientOptions<TKey, TValue, TProvider>) {
		if (!options.provider) {
			throw new MuffinError("Can not invoke a new MuffinClient without a provider");
		}

		this.provider = options.provider;

		this.useCache = options.useCache || false;
		this.cache = options.useCache ? new Map() : undefined;
	}

	get isReady(): boolean {
		return this.provider.isReady;
	}

	get isClosed(): boolean {
		return this.provider.isClosed;
	}

	private useCacheCondition(options: { useCache?: boolean }) {
		return (!options || options.useCache) && this.useCache;
	}

	public async defer(): Promise<this> {
		await this.provider.defer;

		return this;
	}

	public async connect(): Promise<this> {
		await this.provider.connect();

		if (this.options.fetchAll && this.useCache) {
			(await this.provider.fetchAll()).forEach(([key, value]) => this.cache.set(key, value));
		}

		this.provider.resolveDefer();
		this.provider.isReady = true;

		return this;
	}

	public async close(): Promise<void> {
		await this.provider.close();

		this.provider.isClosed = true;
		this.provider.isReady = false;
	}

	public async clear(): Promise<void> {
		await this.provider.defer;

		if (this.useCache) {
			this.cache.clear();
		}

		await this.provider.clear();
	}

	public async delete(key: TKey): Promise<boolean> {
		await this.provider.defer;

		if (this.useCache) {
			this.cache.delete(key);
		}

		return this.provider.delete(key);
	}

	public async entries(options?: { useCache?: boolean }): Promise<IterableIterator<[TKey, TValue]>> {
		await this.provider.defer;

		return this.useCacheCondition(options)
			? this.cache.entries()
			: (await this.provider.entryArray())[Symbol.iterator]();
	}

	public async forEach(
		callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void,
		thisArg?: any,
		options?: { useCache?: boolean }
	): Promise<this> {
		await this.provider.defer;

		// eslint-disable-next-line no-unused-expressions
		this.useCacheCondition(options)
			? this.cache.forEach(callbackfn, thisArg)
			: new Map(await this.provider.entryArray()).forEach(callbackfn, thisArg);

		return this;
	}

	public async get(key: TKey, options?: { useCache?: boolean }): Promise<TValue> {
		await this.provider.defer;

		return this.useCacheCondition(options) ? this.cache.get(key) : this.provider.fetch(key);
	}

	public async fetch(key: TKey): Promise<TValue> {
		await this.provider.defer;

		const value = await this.provider.fetch(key);
		this.cache.set(key, value);

		return value;
	}

	public async has(key: TKey, options?: { useCache?: boolean }): Promise<boolean> {
		await this.provider.defer;

		return this.useCacheCondition(options) ? this.cache.has(key) : this.provider.has(key);
	}

	public async keys(options?: { useCache?: boolean }): Promise<IterableIterator<TKey>> {
		await this.provider.defer;

		return this.useCacheCondition(options)
			? this.cache.keys()
			: (await this.provider.keyArray())[Symbol.iterator]();
	}

	public async set(key: TKey, value: TValue): Promise<this> {
		await this.provider.defer;

		// eslint-disable-next-line no-unused-expressions
		await this.provider.set(key, value);
		if (this.useCache) {
			this.cache.set(key, value);
		}

		return this;
	}

	public async size(): Promise<number> {
		await this.provider.defer;

		return this.provider.size();
	}

	public async values(options?: { useCache?: boolean }): Promise<IterableIterator<TValue>> {
		await this.provider.defer;

		return this.useCacheCondition(options)
			? this.cache.values()
			: (await this.provider.valueArray())[Symbol.iterator]();
	}
}
