
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

    type RawData<TKey, TValue> = {
        _id: TKey,
        value: TValue,
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

        piece<TKey = any, TValue = any>(name: string, options?: PieceOptions): Piece<TKey, TValue>;

        close(): void;

        on<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
        once<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
        emit<K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]): boolean;
    }

    export class Piece<TKey = any, TValue = any> extends EventEmitter {
        base: Collection<{ TKey: TValue }>;
        client: Client;

        cache: Map<TKey, TValue>;
        hasCache: boolean;
        isCacheReady: boolean;

        constructor(base: Collection, client: Client, options?: PieceOptions);

        set(key: TKey, val: TValue, path?: string): Promise<void>;

        push(key: TKey, val: TValue, path?: string, allowDupes?: boolean): Promise<void>;

        ensure(key: TKey, val: TValue): Promise<TValue>;
        ensure(key: TKey, val: TValue, path?: string): Promise<any>;
        ensure(key: TKey, val: TValue, path?: string, raw?: boolean): Promise<RawData<TKey, TValue>>;

        get(key: TKey): Promise<TValue>
        get(key: TKey, path?: string): Promise<any>
        get(key: TKey, path?: string, raw?: boolean): Promise<RawData<TKey, TValue>>;

        fetch(key: TKey): Promise<TValue>
        fetch(key: TKey, path?: string): Promise<any>
        fetch(key: TKey, path?: string, raw?: boolean): Promise<RawData<TKey, TValue>>;

        fetchAll(): Promise<void>;

        has(key: TKey, path?: string): Promise<boolean>;

        delete(key: TKey, path?: string): Promise<void>;

        clear(): Promise<void>;

        evict(key: TKey, path?: string): void;

        evictAll(): void;

        valueArray(cache?: boolean): Promise<TValue[]>;

        keyArray(cache?: boolean): Promise<TKey[]>;
        
        rawArray(): Promise<RawData<TKey, TValue>[]>;

        size(fast?: boolean): Promise<number>;

        on(event: "change", listener: (change: any) => void): this;
        once(event: "change", listener: (change: any) => void): this;
        emit(event: "change", change: any): boolean;
    }
}