
import { HttpConfig } from "../types";
import { Utils, Defaults } from "../helper";
import { ConnectionClosedError, NoSufficientCacheSpaceLeftError } from "../exception";
import { CacheManager, CacheManagerOption } from "./CacheManager";

export type IndexDbCacheManagerOption<T1 = any, T2 = any> = CacheManagerOption<T1, T2, IDBDatabase | string> & {
    maxSize?: number;
    storeName?: string;
};

export class IndexDbCacheManager<T> implements CacheManager<T> {

    private _usedSpace: number;
    private _availableSpace: number;
    private _connectionStatus = "CONNECTING";
    private _options: IndexDbCacheManagerOption;
    protected static instance: IndexDbCacheManager<any>;
    private _sizeTrackerKey: string = "__fu_used_space__";

    constructor(options?: IndexDbCacheManagerOption) {
        this._options = {
            ...(options ?? {}),
            maxSize: options?.maxSize ?? Defaults.INDEXDB_DEFAULT_MAX_SIZE,
            storeName: options?.storeName ?? Defaults.INDEXDB_DEFAULT_STORE_NAME,
        };
        if (typeof options?.bucket === "string") {
            const indexedDBRequest = indexedDB.open(options?.bucket, Defaults.INDEXDB_VERSION);
            indexedDBRequest!.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this._options.storeName!)) {
                    db.createObjectStore(this._options.storeName!);
                }
            };
            indexedDBRequest!.onsuccess = (async (event: Event) => {
                this._options.bucket = (event.target as IDBOpenDBRequest).result as IDBDatabase;
                await this.setInstanceVariables();
                this._connectionStatus = "SUCCESS";
            }).bind(this);
            indexedDBRequest!.onerror = ((event: Event) => {
                const error = (event.target as IDBOpenDBRequest).error;
                this._connectionStatus = "FAILED";
                throw error;
            }).bind(this);
        }

        this._usedSpace = 0;
        this._availableSpace = Math.max(this._options.maxSize! - this._usedSpace, 0);

        this.get = this.get.bind(this);
        this.set = this.set.bind(this);
        this.has = this.has.bind(this);
        this.clear = this.clear.bind(this);
        this._resolve = this._resolve.bind(this);
    }

    static getInstance(options?: IndexDbCacheManagerOption) {
        if (!IndexDbCacheManager.instance) IndexDbCacheManager.instance = new IndexDbCacheManager(options);
        return IndexDbCacheManager.instance;
    }

    async usedSpace(): Promise<number> {
        return this._usedSpace;
    }

    async availableSpace(): Promise<number> {
        return this._availableSpace;
    }

    async calculateSpace(configOrKey: string | HttpConfig, value: T): Promise<number> {
        const resolve = await this._resolve(configOrKey);
        const entryStr = Utils.safeStringify({ value, date: new Date() });
        return (resolve.key.length + ((this._options.encryptor ? (await this._options.encryptor.encrypt(entryStr, true)) : entryStr) + `#_kce_`).length + 2);
    }

    async has(configOrKey: string | HttpConfig): Promise<boolean> {
        return (await this._resolve(configOrKey)).exists;
    }

    async get(configOrKey: string | HttpConfig): Promise<{ date: Date; value: T; } | undefined> {
        const resolve = await this._resolve(configOrKey);
        if (!resolve.exists) return undefined;
        const value = await this.getEntryFromDb(resolve.key);
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
        const finalValue = (this._options.encryptor ? await this._options.encryptor.encrypt(entryStr, true) : entryStr);
        const spaceAllocated = finalValue.length;
        if (spaceAllocated > await this.availableSpace()) {
            throw new NoSufficientCacheSpaceLeftError();
        }
        await this.putEntryInDb(resolve.key, finalValue);
        this._usedSpace += spaceAllocated;
        this._availableSpace -= spaceAllocated;
        await this.putEntryInDb(this._sizeTrackerKey, `${this._usedSpace}`);
    }

    async remove(configOrKey: string | HttpConfig, resolve?: { exists: boolean; key: string; }): Promise<void> {
        if (!resolve) resolve = await this._resolve(configOrKey);
        if (!resolve.exists) return;
        const spaceToFree = await this.calculateSpace(resolve.key, this.getValue(configOrKey) as any);
        this._usedSpace -= spaceToFree;
        this._availableSpace += spaceToFree;
        await this.putEntryInDb(this._sizeTrackerKey, `${this._usedSpace}`);
    }

    async clear(): Promise<void> {
        const transaction = (this._options!.bucket as IDBDatabase)!.transaction!([this._options.storeName!], "readwrite");
        const store = transaction.objectStore(this._options.storeName!);

        return new Promise<void>((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => {
                transaction.oncomplete = () => {
                    resolve();
                };
            };
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async find(cond: (key: string) => boolean) {
        const transaction = (this._options!.bucket as IDBDatabase)!.transaction!([this._options.storeName!], "readonly");
        const store = transaction.objectStore(this._options.storeName!);

        return new Promise<string[]>(async (resolve, reject) => {
            const found: string[] = [];
            const request = store.openCursor();
            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    if (cond(cursor.key as any)) found.push(cursor.key as any);
                    cursor.continue();
                } else {
                    resolve(found);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    private async _getEntryFromDb(key: string) {
        const transaction = (this._options!.bucket as IDBDatabase)!.transaction!([this._options.storeName!], "readonly");
        const store = transaction.objectStore(this._options.storeName!);

        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => {
                transaction.oncomplete = () => {
                    resolve(request.result);
                };
            };
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    private async getEntryFromDb(key: string, skipWait?: boolean) {
        if (skipWait) return await this._getEntryFromDb(key);
        let waitCountInSeconds = 0;
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (this._connectionStatus === "CONNECTING") {
                    if (waitCountInSeconds >= 10) {
                        reject(new ConnectionClosedError("Failed to detect IndexDB connection after 10 seconds wait"));
                        clearInterval(interval);
                    }
                    waitCountInSeconds++;
                    return;
                }
                clearInterval(interval);
                this._getEntryFromDb(key).then(resolve).catch(reject);
            }, 1000);
        });
    }

    private async _putEntryInDb(key: string, value: string) {
        const transaction = (this._options!.bucket as IDBDatabase)!.transaction!([this._options.storeName!], "readwrite");
        const store = transaction.objectStore(this._options.storeName!);

        return new Promise<void>((resolve, reject) => {
            const request = store.put(value, key);
            request.onsuccess = () => {
                transaction.oncomplete = () => {
                    resolve();
                };
            };
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    private async putEntryInDb(key: string, value: string) {
        let waitCountInSeconds = 0;
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (this._connectionStatus === "CONNECTING") {
                    if (waitCountInSeconds >= 10) {
                        reject(new ConnectionClosedError("Failed to detect IndexDB connection after 10 seconds wait"));
                        clearInterval(interval);
                    }
                    waitCountInSeconds++;
                    return;
                }
                clearInterval(interval);
                this._putEntryInDb(key, value).then(resolve).catch(reject);
            }, 1000);
        });
    }

    private async setInstanceVariables() {
        const result = await this.getEntryFromDb(this._sizeTrackerKey, true);
        if (!result) return;
        this._usedSpace = parseInt(`${result}`);
        this._availableSpace = Math.max(this._options.maxSize! - this._usedSpace, 0);
    }

    private async _resolve(configOrKey: string | HttpConfig): Promise<{ exists: boolean; key: string; }> {
        let key = ((typeof configOrKey === "string") ? configOrKey : Utils.buildCacheKey(configOrKey));
        key = (this._options.encryptKey && this._options.encryptor ? await this._options.encryptor.encrypt(key, true) : key);
        const exists = !!(await this.getEntryFromDb(key));
        return { key, exists };
    }

}
