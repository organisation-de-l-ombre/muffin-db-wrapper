/* eslint-disable no-unused-expressions */
import { createClient, RedisClient } from "redis";

export interface ProviderOptions {
	password?: string;
	port?: number;
	host?: string;

	dbNumber: string | number;
	prefix?: string;
	detectBuffers?: boolean;
}

export class RedisProvider {
	public conn: RedisClient;

	public isReady = false;
	public isClosed = false;

	public resolveDefer: () => void;
	public defer: Promise<void>;

	constructor(public options: ProviderOptions) {
		const { password, port, host, dbNumber, prefix, detectBuffers } = options;
		this.conn = createClient({
			db: dbNumber,
			detect_buffers: detectBuffers,
			host,
			password,
			port,
			prefix,
		});

		this.defer = new Promise((res) => {
			this.resolveDefer = res;
		});

		this.conn.once("connect", () => {
			this.isReady = true;
			this.resolveDefer();
		});
	}

	public async connect(): Promise<void> {
		await this.defer;
	}

	public close(): Promise<void> {
		return new Promise((res, rej) => {
			this.conn.quit((err) => {
				this.isClosed = true;
				err ? rej(err) : res();
			});
		});
	}

	public size(): Promise<number> {
		return new Promise((res, rej) => {
			this.conn.dbsize((err, reply) => (err ? rej(err) : res(reply)));
		});
	}

	public clear(): Promise<void> {
		return new Promise((res, rej) => {
			this.conn.flushdb((err) => (err ? rej(err) : res()));
		});
	}

	public delete(key: string): Promise<boolean> {
		return new Promise((res, rej) => {
			this.conn.del(key, (err, reply) => (err ? rej(err) : res(reply > 0)));
		});
	}
}

export default RedisProvider;
