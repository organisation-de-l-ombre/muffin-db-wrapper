/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable require-await */

import CustomError from "./CustomError";

export function isNullOrUndefined(something: any) {
	return something === null || something === undefined;
}

export interface BaseProvider<TKey, TValue> {
	options: any;
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
export class Client<TKey, TValue, TProvider extends BaseProvider<TKey, TValue> = BaseProvider<TKey, TValue>> {
	public provider: TProvider;

	constructor(public options: ClientOptions<TKey, TValue, TProvider>) {
		if (!options.provider) {
			throw new CustomError("Can not invoke a new MuffinClient without a provider");
		}

		this.provider = options.provider;
	}

	get isReady(): boolean {
		return this.provider.isReady;
	}

	get isClosed(): boolean {
		return this.provider.isClosed;
	}

	private keyCheck(key: TKey) {
		if (isNullOrUndefined(key)) {
			throw new CustomError("`key` must not be undefined !");
		}
	}

	private valueCheck(value: TValue) {
		if (isNullOrUndefined(value)) {
			throw new CustomError("`value` must not be undefined !");
		}
	}

	private closeCheck() {
		if (this.isClosed) {
			throw new CustomError("The connection is closed");
		}
	}

	public async defer(): Promise<this> {
		await this.provider.defer;

		return this;
	}

	public async connect(): Promise<this> {
		if (this.isReady) {
			throw new CustomError("Provider already connected");
		}

		await this.provider.connect();

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

		await this.provider.clear();
	}

	public async delete(key: TKey): Promise<boolean> {
		this.closeCheck();
		await this.provider.defer;

		return this.provider.delete(key);
	}

	public async entries(): Promise<IterableIterator<[TKey, TValue]>> {
		this.closeCheck();
		await this.provider.defer;

		return (await this.provider.entryArray())[Symbol.iterator]();
	}

	public async array(): Promise<[TKey, TValue][]> {
		this.closeCheck();
		await this.provider.defer;

		return this.provider.entryArray();
	}

	public async forEach(
		callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void,
		thisArg?: any
	): Promise<this> {
		this.closeCheck();
		await this.provider.defer;

		// eslint-disable-next-line no-unused-expressions
		new Map(await this.provider.entryArray()).forEach(callbackfn, thisArg);

		return this;
	}

	public async get(key: TKey): Promise<TValue> {
		this.closeCheck();
		await this.provider.defer;

		this.keyCheck(key);

		return this.provider.fetch(key);
	}

	public async has(key: TKey): Promise<boolean> {
		this.closeCheck();
		await this.provider.defer;

		this.keyCheck(key);

		return this.provider.has(key);
	}

	public async keys(): Promise<IterableIterator<TKey>> {
		this.closeCheck();
		await this.provider.defer;

		return (await this.provider.keyArray())[Symbol.iterator]();
	}

	public async keyArray(): Promise<TKey[]> {
		this.closeCheck();
		await this.provider.defer;

		return this.provider.keyArray();
	}

	public async set(key: TKey, value: TValue): Promise<this> {
		this.closeCheck();
		await this.provider.defer;

		this.keyCheck(key);
		this.valueCheck(value);

		// eslint-disable-next-line no-unused-expressions
		await this.provider.set(key, value);

		return this;
	}

	public async setMany(array: [TKey, TValue][]): Promise<this> {
		// eslint-disable-next-line no-void
		await Promise.all(array.map(([key, value]) => this.set(key, value)));

		return this;
	}

	public get size(): Promise<number> {
		this.closeCheck();
		return this.provider.defer.then(() => this.provider.size());
	}

	public async values(): Promise<IterableIterator<TValue>> {
		this.closeCheck();
		await this.provider.defer;

		return (await this.provider.valueArray())[Symbol.iterator]();
	}

	public async valueArray(): Promise<TValue[]> {
		this.closeCheck();
		await this.provider.defer;

		return this.provider.valueArray();
	}
}
