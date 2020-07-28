/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable require-await */

import MuffinError from "./MuffinError";

export interface BaseProvider<TKey = any, TValue = any> {
	defer: Promise<void>;
	isReady: boolean;
	connect: () => Promise<void>;

	size: Promise<number>;
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
}

export class MuffinClient<TKey = any, TValue = any> {
	provider: BaseProvider;
	defer: BaseProvider["defer"];
	cache: Map<TKey, TValue>;

	useCache: boolean;

	constructor({ provider, useCache }: ClientOptions) {
		if (!provider) {
			throw new MuffinError("Can not invoke a new MuffinClient without a provider");
		}

		this.provider = provider;
		this.defer = provider.defer;

		this.useCache = useCache || false;
		this.cache = useCache ? new Map() : undefined;
	}

	get isReady(): boolean {
		return this.provider.isReady;
	}

	private readyCheck() {
		if (!this.isReady) {
			throw new MuffinError("The database is not ready");
		}
	}

	private useCacheCondition(options: { useCache?: boolean }) {
		return (!options || options.useCache) && this.useCache;
	}

	async connect(): Promise<this> {
		await this.provider.connect();

		return this;
	}

	get size(): Promise<number> {
		this.readyCheck();

		return this.provider.size;
	}

	async clear(): Promise<void> {
		this.readyCheck();

		if (this.useCache) {
			this.cache.clear();
		}

		await this.provider.clear();
	}

	async delete(key: TKey): Promise<boolean> {
		this.readyCheck();

		if (this.useCache) {
			this.cache.delete(key);
		}

		return this.provider.delete(key);
	}

	async entries(options?: { useCache?: boolean }): Promise<IterableIterator<[TKey, TValue]>> {
		this.readyCheck();

		return this.useCacheCondition(options) ? this.cache.entries() : this.provider.entries();
	}

	async forEach(
		callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void,
		thisArg?: any,
		options?: { useCache?: boolean }
	): Promise<this> {
		this.readyCheck();

		// eslint-disable-next-line no-unused-expressions
		this.useCacheCondition(options)
			? this.cache.forEach(callbackfn, thisArg)
			: new Map(await this.provider.entries()).forEach(callbackfn, thisArg);

		return this;
	}

	async get(key: TKey, options?: { useCache?: boolean }): Promise<TValue> {
		this.readyCheck();

		return this.useCacheCondition(options) ? this.cache.get(key) : this.provider.get(key);
	}

	async has(key: TKey, options?: { useCache?: boolean }): Promise<boolean> {
		this.readyCheck();

		return this.useCacheCondition(options) ? this.cache.has(key) : this.provider.has(key);
	}

	async keys(options?: { useCache?: boolean }): Promise<IterableIterator<TKey>> {
		this.readyCheck();

		return this.useCacheCondition(options) ? this.cache.keys() : this.provider.keys();
	}

	async set(key: TKey, value: TValue): Promise<this> {
		this.readyCheck();

		// eslint-disable-next-line no-unused-expressions
		await this.provider.set(key, value);
		if (this.useCache) {
			this.cache.set(key, value);
		}

		return this;
	}

	async values(options?: { useCache?: boolean }): Promise<IterableIterator<TValue>> {
		this.readyCheck();

		return this.useCacheCondition(options) ? this.cache.values() : this.provider.values();
	}
}
