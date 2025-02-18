
import { HttpConfig } from "../types";
import { Utils, Defaults } from "../helper";
import { NoSufficientCacheSpaceLeftError } from "../exception";
import { CacheManager, CacheManagerOption } from "./CacheManager";

export type StorageCacheManagerOption<T1 = any, T2 = any> = {
    bucket?: Storage;
} & CacheManagerOption<T1, T2>;

export class StorageCacheManager<T> implements CacheManager<T> {

    private _usedSpace: number;
    private _availableSpace: number;
    private _options: StorageCacheManagerOption;

    constructor(bucket: Storage, options?: StorageCacheManagerOption) {
        this._options = {
            ...(options ?? {}),
            bucket,
        };
        this._usedSpace = Utils.storageSpaceUsed(this._options.bucket);
        this._availableSpace = Math.max(Defaults.MaxStorageSpace - this._usedSpace, 0);

        this.get = this.get.bind(this);
        this.set = this.set.bind(this);
        this.has = this.has.bind(this);
        this.clear = this.clear.bind(this);
        this._resolve = this._resolve.bind(this);
    }

    async usedSpace(): Promise<number> {
        return this._usedSpace;
    }

    async availableSpace(): Promise<number> {
        return this._availableSpace;
    }

    async calculateSpace(configOrKey: string | HttpConfig, value: T): Promise<number> {
        const resolve = await this._resolve(configOrKey);
        const entryStr = Utils.safeStringify({
            value,
            date: new Date(),
        });
        return (resolve.key.length + ((this._options.encryptor ? await this._options.encryptor.encrypt(entryStr, true) : entryStr) + `#_kce_`).length);
    }

    async has(configOrKey: string | HttpConfig): Promise<boolean> {
        return (await this._resolve(configOrKey)).exists;
    }

    async get(configOrKey: string | HttpConfig): Promise<{ date: Date; value: T; } | undefined> {
        const resolve = await this._resolve(configOrKey);
        if (!resolve.exists) return undefined;
        const dirtyValue = await this._options.bucket.getItem(resolve.key);
        const value = dirtyValue.substring(0, dirtyValue.lastIndexOf("#"));
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
        const resolve = await this._resolve(configOrKey);
        const entryStr = Utils.safeStringify({
            value,
            date: new Date(),
        });
        const finalValue = (this._options.encryptor ? await this._options.encryptor.encrypt(entryStr, true) : entryStr) + `#_kce_`;
        const spaceAllocated = finalValue.length;
        if (spaceAllocated > await this.availableSpace()) {
            throw new NoSufficientCacheSpaceLeftError();
        }
        if (resolve.exists) await this.remove(resolve.key);
        await this._options.bucket.setItem(resolve.key, finalValue);
        this._usedSpace += spaceAllocated;
        this._availableSpace -= spaceAllocated;
    }

    async remove(configOrKey: string | HttpConfig): Promise<void> {
        const resolve = await this._resolve(configOrKey);
        if (!resolve.exists) return;
        const spaceToFree = (await this._options.bucket.getItem(resolve.key)).length;
        this._usedSpace -= spaceToFree;
        this._availableSpace += spaceToFree;
        await this._options.bucket.removeItem(resolve.key);
    }

    async clear(): Promise<void> {
        const keys: string[] = [];
        Utils.getStorageEntries(this._options.bucket, (key: string, value: any) => {
            if (`${value}`.endsWith(`#_kce_`)) keys.push(key);
        });
        for (const key of keys) await this.remove(key);
    }

    async find(cond: (key: string) => boolean) {
        const found: string[] = [];
        Utils.getStorageEntries(this._options.bucket, (key: string, _: any) => {
            if (cond(key)) found.push(key);
        });
        return found;
    }

    private async _resolve(configOrKey: string | HttpConfig): Promise<{ exists: boolean; key: string; }> {
        let key = ((typeof configOrKey === "string") ? configOrKey : Utils.buildCacheKey(configOrKey));
        key = (this._options.encryptKey && this._options.encryptor ? await this._options.encryptor.encrypt(key, true) : key);
        const exists = key in this._options.bucket
            || (!!this._options.bucket.multiMerge && !!(await this._options.bucket.getItem(key))); // react-native AsyncStorage
        return { key, exists };
    }

}
