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

	async entries(options?: { useCache: boolean }): Promise<IterableIterator<[TKey, TValue]>> {
		this.readyCheck();

		return (!options || options.useCache) && this.useCache ? this.cache.entries() : this.provider.entries();
	}

	async forEach(
		callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void,
		thisArg?: any,
		options?: { useCache: boolean }
	): Promise<this> {
		if ((!options || options.useCache) && this.useCache) {
			this.cache.forEach(callbackfn, thisArg);
		} else {
			new Map(await this.provider.entries()).forEach(callbackfn, thisArg);
		}

		return this;
	}
}
