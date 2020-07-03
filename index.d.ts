
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

    export const version: string;

    export class Client extends EventEmitter {
        defer: Promise<void>;
        dbName: string;
        isReady: boolean;
        closed: boolean;

        constructor(options: ClientOptions);

        multi(names: string[], options?: PieceOptions): DynamicObject;
        piece(name: string, options?: PieceOptions): Piece;
        close(): void;

        on<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
        once<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
        emit<K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]): boolean;
    }

    export class Piece<T = any> extends EventEmitter {
        base: Collection;
        client: Client;
        hasCache: boolean;
        cache: Map<any, any>;
        isCacheReady: boolean;

        constructor(base: Collection, client: Client, options?: PieceOptions);

        set(key: any, val: any, path?: string): Promise<void>;
        ensure(key: any, val: any, path?: string, raw?: boolean): Promise<any> | Promise<RawData>;
        push(key: any, val: any, path?: string, allowDupes?: boolean): Promise<void>;

        get(key: any, path?: string, raw?: boolean): Promise<any> | Promise<RawData>;
        fetch(key: any, path?: any, raw?: boolean): Promise<any> | Promise<RawData>;
        fetchAll(): Promise<void>;

        has(key: any, path?: string): Promise<boolean>;

        delete(key: any, path?: string): Promise<void>;
        clear(): Promise<void>;

        evict(key: any, path?: string): void;
        evictAll(): void;

        valueArray(cache?: boolean): Promise<any[]>;
        keyArray(cache?: boolean): Promise<any[]>;
        rawArray(): Promise<RawData[]>;

        size(fast?: boolean): Promise<number>;

        on(event: "change", listener: (change: object) => void): this;
        once(event: "change", listener: (change: object) => void): this;
        emit(event: "change", change: object): boolean;
    }
}