
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

    async usedSpace(): Promise<number> {
        return this._entriesCount;
    }

    async availableSpace(): Promise<number> {
        return this._options.maxEntries! - this._entriesCount;
    }

    async calculateSpace(_: string | HttpConfig, __: T): Promise<number> {
        return 1;
    }

    async has(configOrKey: string | HttpConfig): Promise<boolean> {
        return (await this._resolve(configOrKey)).exists;
    }

    async get(configOrKey: string | HttpConfig): Promise<{ date: Date; value: T; } | undefined> {
        const resolve = await this._resolve(configOrKey);
        if (!resolve.exists) return undefined;
        const value = this._options.bucket[resolve.key];
        const parsed = JSON.parse(this._options.encryptor ? await this._options.encryptor.decrypt(value, true) : value);
        return {
            value: parsed.value,
            date: new Date(parsed.date),
        };
    }

    async getValue(configOrKey: string | HttpConfig): Promise<T | undefined> {
        return (await this.get(configOrKey) ?? {}).value;
    }

    async set(configOrKey: string | HttpConfig, value: T): Promise<void> {
        if (this.calculateSpace(configOrKey, value) > this.availableSpace()) {
            throw new NoSufficientCacheSpaceLeftError();
        }
        const resolve = await this._resolve(configOrKey);
        const entryStr = Utils.safeStringify({
            value,
            date: new Date(),
        });
        this._options.bucket[resolve.key] = (this._options.encryptor ? await this._options.encryptor.encrypt(entryStr, true) : entryStr);
        if (!resolve.exists) this._entriesCount++;
    }

    async remove(configOrKey: string | HttpConfig): Promise<void> {
        const resolve = await this._resolve(configOrKey);
        if (!resolve.exists) return;
        delete this._options.bucket[resolve.key];
        this._entriesCount--;
    }

    async clear(): Promise<void> {
        this._options.bucket = {};
        this._entriesCount = 0;
    }

    async find(cond: (key: string) => boolean) {
        const found: string[] = [];
        for (const key in this._options.bucket) {
            if (cond(key)) found.push(key);
        }
        return found;
    }

    private async _resolve(configOrKey: string | HttpConfig): Promise<{ exists: boolean; key: string; }> {
        let key = ((typeof configOrKey === "string") ? configOrKey : Utils.buildCacheKey(configOrKey));
        key = (this._options.encryptKey && this._options.encryptor ? await this._options.encryptor.encrypt(key, true) : key);
        const exists = key in this._options.bucket;
        return { key, exists };
    }

}
