
import { HttpConfig } from "../types";
import { Utils, Defaults } from "../helper";
import { NoSufficientCacheSpaceLeftError } from "../exception";
import { CacheManager, CacheManagerOption } from "./CacheManager";

export type MapCacheManagerOption<T1 = any, T2 = any> = {
    maxEntries?: number;
} & CacheManagerOption<T1, T2>;

export class MapCacheManager<T> implements CacheManager<T> {

    private _entriesCount: number;
    private _options: MapCacheManagerOption;
    protected static instance: MapCacheManager<any>;

    constructor(options?: MapCacheManagerOption) {
        this._entriesCount = 0;
        this._options = {
            bucket: {},
            maxEntries: Defaults.MaxObjectEntrySize,
            ...(options ?? {})
        };

        this.get = this.get.bind(this);
        this.set = this.set.bind(this);
        this.has = this.has.bind(this);
        this.clear = this.clear.bind(this);
        this._resolve = this._resolve.bind(this);
    }

    static getInstance(options?: MapCacheManagerOption) {
        if (!MapCacheManager.instance) MapCacheManager.instance = new MapCacheManager(options);
        return MapCacheManager.instance;
    }

    usedSpace(): number {
        return this._entriesCount;
    }

    availableSpace(): number {
        return this._options.maxEntries! - this._entriesCount;
    }

    calculateSpace(_: string | HttpConfig, __: T): number {
        return 1;
    }

    has(configOrKey: string | HttpConfig): boolean {
        return this._resolve(configOrKey).exists;
    }

    get(configOrKey: string | HttpConfig): { date: Date; value: T; } | undefined {
        const resolve = this._resolve(configOrKey);
        if (!resolve.exists) return undefined;
        const value = this._options.bucket[resolve.key];
        const parsed = JSON.parse(this._options.encryptor ? this._options.encryptor.decrypt(value) : value);
        return {
            value: parsed.value,
            date: new Date(parsed.date),
        };
    }

    getValue(configOrKey: string | HttpConfig): T | undefined {
        return (this.get(configOrKey)?? {}).value;
    }

    set(configOrKey: string | HttpConfig, value: T): void {
        if (this.calculateSpace(configOrKey, value) > this.availableSpace()) {
            throw new NoSufficientCacheSpaceLeftError();
        }
        const resolve = this._resolve(configOrKey);
        const entryStr = Utils.safeStringify({
            value,
            date: new Date(),
        });
        this._options.bucket[resolve.key] = (this._options.encryptor ? this._options.encryptor.encrypt(entryStr) : entryStr);
        if (!resolve.exists) this._entriesCount++;
    }

    remove(configOrKey: string | HttpConfig): void {
        const resolve = this._resolve(configOrKey);
        if (!resolve.exists) return;
        delete this._options.bucket[resolve.key];
        this._entriesCount--;
    }

    clear(): void {
        this._options.bucket = {};
        this._entriesCount = 0;
    }

    find(cond: (key: string) => boolean) {
        const found: string[] = [];
        for (const key in this._options.bucket) {
            if (cond(key)) found.push(key);
        }
        return found;
    }

    private _resolve(configOrKey: string | HttpConfig): { exists: boolean; key: string; } {
        let key = ((typeof configOrKey === "string") ? configOrKey : Utils.buildCacheKey(configOrKey));
        key = (this._options.encryptKey && this._options.encryptor ? this._options.encryptor.encrypt(key) : key);
        const exists = key in this._options.bucket;
        return { key, exists };
    }

}
