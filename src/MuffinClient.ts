import MuffinError from "./MuffinError";

export interface BaseProvider {
	defer: Promise<void>;
	isReady: boolean;
	connect: () => Promise<this>;
}

export interface ClientOptions {
	provider: BaseProvider;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default class MuffinClient<TKey = any, TValue = any> {
	defer: BaseProvider["defer"];
	cache: Map<TKey, TValue>;
	provider: BaseProvider;

	constructor({ provider }: ClientOptions) {
		if (!provider) {
			throw new MuffinError("Can not initialize a new MuffinClient without a provider");
		}

		this.provider = provider;
		this.defer = provider.defer;
	}

	get isReady(): boolean {
		return this.provider.isReady;
	}
}
