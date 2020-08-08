/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable require-await */

import MuffinError from "./MuffinError";

export function isNullOrUndefined(something: any) {
	return something === null || something === undefined;
}

export interface BaseProvider<TKey, TValue> {
	conn: any;

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

	private keyCheck(key: TKey) {
		if (isNullOrUndefined(key)) {
			throw new MuffinError("`key` must not be undefined !");
		}
	}

	private valueCheck(value: TValue) {
		if (isNullOrUndefined(value)) {
			throw new MuffinError("`value` must not be undefined !");
		}
	}

	private closeCheck() {
		if (this.isClosed) {
			throw new MuffinError("The connection is closed");
		}
	}

	public async defer(): Promise<this> {
		await this.provider.defer;

		return this;
	}

	public async connect(): Promise<this> {
		if (this.isReady) {
			throw new MuffinError("Provider already connected");
		}

		await this.provider.connect();

		if (this.options.fetchAll && this.useCache) {
			(await this.provider.entryArray()).forEach(([key, value]) => this.cache.set(key, value));
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
		this.closeCheck();
		await this.provider.defer;

		if (this.useCache) {
			this.cache.clear();
		}

		await this.provider.clear();
	}

	public async delete(key: TKey): Promise<boolean> {
		this.closeCheck();
		await this.provider.defer;

		if (this.useCache) {
			this.cache.delete(key);
		}

		return this.provider.delete(key);
	}

	public async entries(options?: { useCache?: boolean }): Promise<IterableIterator<[TKey, TValue]>> {
		this.closeCheck();
		await this.provider.defer;

		return this.useCacheCondition(options)
			? this.cache.entries()
			: (await this.provider.entryArray())[Symbol.iterator]();
	}

	public async array(options?: { useCache?: boolean }): Promise<[TKey, TValue][]> {
		this.closeCheck();
		await this.provider.defer;

		return this.useCacheCondition(options) ? [...this.cache.entries()] : this.provider.entryArray();
	}

	public async forEach(
		callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void,
		thisArg?: any,
		options?: { useCache?: boolean }
	): Promise<this> {
		this.closeCheck();
		await this.provider.defer;

		// eslint-disable-next-line no-unused-expressions
		this.useCacheCondition(options)
			? this.cache.forEach(callbackfn, thisArg)
			: new Map(await this.provider.entryArray()).forEach(callbackfn, thisArg);

		return this;
	}

	public async get(key: TKey, options?: { useCache?: boolean }): Promise<TValue> {
		this.closeCheck();
		await this.provider.defer;

		this.keyCheck(key);

		if (this.useCacheCondition(options)) {
			let value = this.cache.get(key);

			if (isNullOrUndefined(value)) {
				value = await this.fetch(key);
			}

			return value;
		} else {
			return this.provider.fetch(key);
		}
	}

	public async fetch(key: TKey): Promise<TValue> {
		this.closeCheck();
		await this.provider.defer;

		this.keyCheck(key);

		const value = await this.provider.fetch(key);

		if (!isNullOrUndefined(value) && this.useCache) {
			this.cache.set(key, value);
		}

		return value;
	}

	public async has(key: TKey, options?: { useCache?: boolean }): Promise<boolean> {
		this.closeCheck();
		await this.provider.defer;

		this.keyCheck(key);

		return this.useCacheCondition(options) ? this.cache.has(key) : this.provider.has(key);
	}

	public async keys(options?: { useCache?: boolean }): Promise<IterableIterator<TKey>> {
		this.closeCheck();
		await this.provider.defer;

		return this.useCacheCondition(options)
			? this.cache.keys()
			: (await this.provider.keyArray())[Symbol.iterator]();
	}

	public async keyArray(options?: { useCache?: boolean }): Promise<TKey[]> {
		this.closeCheck();
		await this.provider.defer;

		return this.useCacheCondition(options) ? [...this.cache.keys()] : this.provider.keyArray();
	}

	public async set(key: TKey, value: TValue, options?: { useCache?: boolean }): Promise<this> {
		this.closeCheck();
		await this.provider.defer;

		this.keyCheck(key);
		this.valueCheck(value);

		// eslint-disable-next-line no-unused-expressions
		await this.provider.set(key, value);
		if (this.useCacheCondition(options)) {
			this.cache.set(key, value);
		}

		return this;
	}

	public async setMany(array: [TKey, TValue][], options?: { useCache?: boolean }): Promise<this> {
		// eslint-disable-next-line no-void
		await Promise.all(array.map(([key, value]) => void this.set(key, value, options)));

		return this;
	}

	public get size(): Promise<number> {
		this.closeCheck();
		return this.provider.defer.then(() => this.provider.size());
	}

	public async values(options?: { useCache?: boolean }): Promise<IterableIterator<TValue>> {
		this.closeCheck();
		await this.provider.defer;

		return this.useCacheCondition(options)
			? this.cache.values()
			: (await this.provider.valueArray())[Symbol.iterator]();
	}

	public async valueArray(options?: { useCache?: boolean }): Promise<TValue[]> {
		this.closeCheck();
		await this.provider.defer;

		return this.useCacheCondition(options) ? [...this.cache.values()] : this.provider.valueArray();
	}
}
