import MuffinError from "./MuffinError";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BaseProvider<TKey = any, TValue = any> {
	defer: Promise<void>;
	isReady: boolean;
	connect: () => Promise<void>;

	size: Promise<boolean>;
	clear: () => Promise<void>;
	delete: (key: TKey) => Promise<boolean>;
}

export interface ClientOptions {
	provider: BaseProvider;
	useCache: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

		if (this.useCache) {
			this.cache = new Map();
		}
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

	get size(): Promise<boolean> {
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

	async delete(key: TKey): Promise<this> {
		this.readyCheck();
		if (this.useCache) {
			this.cache.delete(key);
		}

		await this.provider.delete(key);

		return this;
	}
}
