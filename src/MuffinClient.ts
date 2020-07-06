import MuffinError from "./MuffinError";

export interface BaseProvider {
	defer: Promise<void>;
	isReady: boolean;
	connect: () => Promise<void>;
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

	private readyCheck() {
		if (!this.isReady) {
			throw new MuffinError("The database is not ready");
		}
	}

	get isReady(): boolean {
		return this.provider.isReady;
	}

	async connect(): Promise<this> {
		await this.provider.connect();

		return this;
	}
}
