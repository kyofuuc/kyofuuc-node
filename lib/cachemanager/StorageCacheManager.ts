
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
        this._has = this._has.bind(this);
        this.clear = this.clear.bind(this);
    }

    usedSpace(): number {
        return this._usedSpace;
    }

    availableSpace(): number {
        return this._availableSpace;
    }

    calculateSpace(value: T): number {
        const entryStr = Utils.safeStringify({
            value,
            date: new Date(),
        });
        return ((this._options.encryptor ? this._options.encryptor.encrypt(entryStr) : entryStr) + `#_kce_`).length;
    }

    _has(configOrKey: string | HttpConfig): { exists: boolean; key: string; } {
        let key = ((typeof configOrKey === "string") ? configOrKey : Utils.buildCacheKey(configOrKey));
        key = (this._options.encryptKey && this._options.encryptor ? this._options.encryptor.encrypt(key) : key);
        const exists = key in this._options.bucket;
        return { key, exists };
    }

    has(configOrKey: string | HttpConfig): boolean {
        return this._has(configOrKey).exists;
    }

    get(configOrKey: string | HttpConfig): { date: Date; value: T; } | undefined {
        const resolve = this._has(configOrKey);
        if (!resolve.exists) return undefined;
        const dirtyValue = this._options.bucket.getItem(resolve.key);
        const value = dirtyValue.substring(0, dirtyValue.lastIndexOf("#"));
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
        const resolve = this._has(configOrKey);
        const entryStr = Utils.safeStringify({
            value,
            date: new Date(),
        });
        const finalValue = (this._options.encryptor ? this._options.encryptor.encrypt(entryStr) : entryStr) + `#_kce_`;
        const spaceAllocated = finalValue.length;
        if (spaceAllocated > this.availableSpace()) {
            throw new NoSufficientCacheSpaceLeftError();
        }
        if (resolve.exists) this.remove(resolve.key);
        this._options.bucket.setItem(resolve.key, finalValue);
        this._usedSpace += spaceAllocated;
        this._availableSpace -= spaceAllocated;
    }

    remove(configOrKey: string | HttpConfig): void {
        const resolve = this._has(configOrKey);
        if (!resolve.exists) return;
        const spaceToFree = this._options.bucket.getItem(resolve.key).length;
        this._usedSpace -= spaceToFree;
        this._availableSpace += spaceToFree;
        this._options.bucket.removeItem(resolve.key);
    }

    clear(): void {
        const keys: string[] = [];
        Utils.getStorageEntries(this._options.bucket, (key: string, value: any) => {
            if (`${value}`.endsWith(`#_kce_`)) keys.push(key);
        });
        for (const key of keys) this.remove(key);
    }

    find(cond: (key: string) => boolean) {
        const found: string[] = [];
        Utils.getStorageEntries(this._options.bucket, (key: string, _: any) => {
            if (cond(key)) found.push(key);
        });
        return found;
    }

}
