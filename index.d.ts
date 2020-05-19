
import { EventEmitter } from "events";
import { MongoError, Collection } from "mongodb";

declare module "./" {
    type ClientOptions = {
        username?: string,
        password?: string,
        port?: number,
        host?: string,
        url?: string,
        dbName: string
    }

    type PieceOptions = {
        fetchAll?: boolean
    }

    type RawData = {
        _id: any,
        value: any,
        [key: string]: any
    }

    interface ClientEvents {
        close: [],
        reconnect: [any],
        timeout: [MongoError],
        change: [any]
    }

    interface DynamicObject {
        [key: string]: Piece;
    }

    export class Client extends EventEmitter {
        public defer: Promise<void>;
        public dbName: string;
        public isReady: boolean;
        public closed: boolean;

        constructor(options: ClientOptions);

        public multi(names: string[], options?: PieceOptions): DynamicObject;
        public piece(name: string, options?: PieceOptions): Piece;
        public close(): void;

        public on<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
        public once<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
        public emit<K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]): boolean;
    }

    class Piece extends EventEmitter {
        public base: Collection;
        public client: Client;
        public hasCache: boolean;
        public cache: Map<any, any>;
        public isCacheReady: boolean;

        constructor(base: Collection, client: Client, options?: PieceOptions);

        public set(key: any, val: any, path?: string): Promise<void>;
        public push(key: any, val: any, path?: string, allowDupes?: boolean): Promise<void>;
        public get(key: any, val: any, raw?: boolean): Promise<any> | Promise<RawData>;
        public fetch(key: any, val: any, raw?: boolean): Promise<any> | Promise<RawData>;
        public fetchAll(): Promise<void>;
        public has(key: any, path?: string): Promise<boolean>;
        public ensure(key: any, val: any, path?: string, raw?: boolean): Promise<any> | Promise<RawData>;
        public delete(key: any, val: any): Promise<void>;
        public clear(): Promise<void>;
        public evict(key: any, path?: string): void;
        public evictAll(): void;
        public valueArray(cache?: boolean): Promise<any[]>;
        public keyArray(cache?: boolean): Promise<any[]>;
        public rawArray(): Promise<RawData>;
        public size(fast?: boolean): Promise<number>;

        public on(event: "change", listener: (change: object) => void): this;
        public once(event: "change", listener: (change: object) => void): this;
        public emit(event: "change", change: object): boolean;
    }
}