
import { HttpConfig } from "../types";
import { Utils, Defaults } from "../helper";
import { NoSufficientCacheSpaceLeftError } from "../exception";
import { CacheManager, CacheManagerOption } from "./CacheManager";

export type CookieCacheManagerOption<T1 = any, T2 = any> = {
    bucket?: { cookie: string; };
} & CacheManagerOption<T1, T2>;

export class CookieCacheManager<T> implements CacheManager<T> {

    private _usedSpace: number;
    private _availableSpace: number;
    private _options: CookieCacheManagerOption;
    protected static instance: CookieCacheManager<any>;

    constructor(options?: CookieCacheManagerOption) {
        this._options = {
            bucket: options?.bucket ?? document,
            ...(options ?? {}),
        };
        this._usedSpace = Utils.cookieSpaceUsed(this._options.bucket);
        this._availableSpace = Math.max(Defaults.MaxCookieLength - this._usedSpace, 0);

        this.get = this.get.bind(this);
        this.set = this.set.bind(this);
        this.has = this.has.bind(this);
        this.clear = this.clear.bind(this);
        this._resolve = this._resolve.bind(this);
    }

    static getInstance(options?: CookieCacheManagerOption) {
        if (!CookieCacheManager.instance) CookieCacheManager.instance = new CookieCacheManager(options);
        return CookieCacheManager.instance;
    }

    usedSpace(): number {
        return this._usedSpace;
    }

    availableSpace(): number {
        return this._availableSpace;
    }

    calculateSpace(configOrKey: string | HttpConfig, value: T): number {
        const resolve = this._resolve(configOrKey);
        const entryStr = Utils.safeStringify({ value, date: new Date() });
        return (resolve.key.length + ((this._options.encryptor ? this._options.encryptor.encrypt(entryStr) : entryStr) + `#_kce_`).length + 2);
    }

    has(configOrKey: string | HttpConfig): boolean {
        return this._resolve(configOrKey).exists;
    }

    get(configOrKey: string | HttpConfig): { date: Date; value: T; } | undefined {
        const resolve = this._resolve(configOrKey);
        if (!resolve.exists) return undefined;
        const dirtyValue = Utils.getCookie(this._options.bucket, resolve.key);
        const value = dirtyValue!.substring(0, dirtyValue!.lastIndexOf("#"));
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
        const spaceAllocated = this.calculateSpace(configOrKey, value);
        if (spaceAllocated > this.availableSpace()) {
            throw new NoSufficientCacheSpaceLeftError();
        }
        const resolve = this._resolve(configOrKey);
        const entryStr = Utils.safeStringify({ value, date: new Date(), });
        const finalValue = (this._options.encryptor ? this._options.encryptor.encrypt(entryStr) : entryStr) + `#_kce_`;
        if (resolve.exists) this.remove(resolve.key);
        Utils.addCookie(this._options.bucket, {
            name: resolve.key,
            value: finalValue,
            expires: new Date("Tue, 30 Jul 9024 10:18:20 GMT"),
        });
        this._usedSpace += spaceAllocated;
        this._availableSpace -= spaceAllocated;
    }

    remove(configOrKey: string | HttpConfig): void {
        const resolve = this._resolve(configOrKey);
        if (!resolve.exists) return;
        const spaceToFree = this.calculateSpace(resolve.key, this.getValue(configOrKey) as any);
        this._usedSpace -= spaceToFree;
        this._availableSpace += spaceToFree;
        Utils.removeCookie(this._options.bucket, resolve.key);
    }

    clear(): void {
        const keys: string[] = [];
        Utils.getCookieEntries(this._options.bucket, (key: string, value: any) => {
            if (`${value}`.endsWith(`#_kce_`)) keys.push(key);
        });
        for (const key of keys) this.remove(key);
    }

    find(cond: (key: string) => boolean) {
        const found: string[] = [];
        Utils.getCookieEntries(this._options.bucket, (key: string, _: any) => {
            if (cond(key)) found.push(key);
        });
        return found;
    }

    private _resolve(configOrKey: string | HttpConfig): { exists: boolean; key: string; } {
        let key = ((typeof configOrKey === "string") ? configOrKey : Utils.buildCacheKey(configOrKey));
        key = (this._options.encryptKey && this._options.encryptor ? this._options.encryptor.encrypt(key) : key);
        const exists = this._options.bucket.cookie.includes(`${key}=`);
        return { key, exists };
    }

}
