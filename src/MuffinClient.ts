/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable require-await */

import MuffinError from "./MuffinError";

export interface BaseProvider<TKey = any, TValue = any> {
	isReady: boolean;

	defer(): Promise<void>;
	connect: () => Promise<void>;
	close: () => Promise<void>;

	size: () => Promise<number>;
	clear: () => Promise<void>;
	delete: (key: TKey) => Promise<boolean>;
	entries: () => Promise<IterableIterator<[TKey, TValue]>>;
	get: (key: TKey) => Promise<TValue>;
	has: (key: TKey) => Promise<boolean>;
	keys: () => Promise<IterableIterator<TKey>>;
	set: (key: TKey, value: TValue) => Promise<void>;
	values: () => Promise<IterableIterator<TValue>>;
}

export interface ClientOptions {
	provider: BaseProvider;
	useCache: boolean;
	fetchAll: boolean;
}

export class MuffinClient<TKey = any, TValue = any> {
	public provider: BaseProvider;
	public cache?: Map<TKey, TValue>;

	public useCache: boolean;

	constructor(public options: ClientOptions) {
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

	private useCacheCondition(options: { useCache?: boolean }) {
		return (!options || options.useCache) && this.useCache;
	}

	public async defer(): Promise<this> {
		await this.provider.defer();

		return this;
	}

	public async connect(): Promise<this> {
		await this.provider.connect();

		return this;
	}

	public async close(): Promise<void> {
		await this.provider.close();
	}

	public async clear(): Promise<void> {
		await this.defer();

		if (this.useCache) {
			this.cache.clear();
		}

		await this.provider.clear();
	}

	public async delete(key: TKey): Promise<boolean> {
		await this.defer();

		if (this.useCache) {
			this.cache.delete(key);
		}

		return this.provider.delete(key);
	}

	public async entries(options?: { useCache?: boolean }): Promise<IterableIterator<[TKey, TValue]>> {
		await this.defer();

		return this.useCacheCondition(options) ? this.cache.entries() : this.provider.entries();
	}

	public async forEach(
		callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void,
		thisArg?: any,
		options?: { useCache?: boolean }
	): Promise<this> {
		await this.defer();

		// eslint-disable-next-line no-unused-expressions
		this.useCacheCondition(options)
			? this.cache.forEach(callbackfn, thisArg)
			: new Map(await this.provider.entries()).forEach(callbackfn, thisArg);

		return this;
	}

	public async get(key: TKey, options?: { useCache?: boolean }): Promise<TValue> {
		await this.defer();

		return this.useCacheCondition(options) ? this.cache.get(key) : this.provider.get(key);
	}

	public async has(key: TKey, options?: { useCache?: boolean }): Promise<boolean> {
		await this.defer();

		return this.useCacheCondition(options) ? this.cache.has(key) : this.provider.has(key);
	}

	public async keys(options?: { useCache?: boolean }): Promise<IterableIterator<TKey>> {
		await this.defer();

		return this.useCacheCondition(options) ? this.cache.keys() : this.provider.keys();
	}

	public async set(key: TKey, value: TValue): Promise<this> {
		await this.defer();

		// eslint-disable-next-line no-unused-expressions
		await this.provider.set(key, value);
		if (this.useCache) {
			this.cache.set(key, value);
		}

		return this;
	}

	public async size(): Promise<number> {
		await this.defer();

		return this.provider.size();
	}

	public async values(options?: { useCache?: boolean }): Promise<IterableIterator<TValue>> {
		await this.defer();

		return this.useCacheCondition(options) ? this.cache.values() : this.provider.values();
	}
}
