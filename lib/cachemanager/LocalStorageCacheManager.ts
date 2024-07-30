
import { StorageCacheManagerOption, StorageCacheManager } from "./StorageCacheManager";

export class LocalStorageCacheManager<T> extends StorageCacheManager<T> {

    protected static instance: LocalStorageCacheManager<any>;

    constructor(options?: StorageCacheManagerOption) {
        super(options?.bucket ?? localStorage, options);
    }

    static getInstance(options?: StorageCacheManagerOption) {
        if (!LocalStorageCacheManager.instance) LocalStorageCacheManager.instance = new LocalStorageCacheManager(options);
        return LocalStorageCacheManager.instance;
    }

}
