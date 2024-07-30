
import { StorageCacheManagerOption, StorageCacheManager } from "./StorageCacheManager";

export class SessionStorageCacheManager<T> extends StorageCacheManager<T> {

    protected static instance: SessionStorageCacheManager<any>;

    constructor(options?: StorageCacheManagerOption) {
        super(options?.bucket ?? sessionStorage, options);
    }

    static getInstance(options?: StorageCacheManagerOption) {
        if (!SessionStorageCacheManager.instance) SessionStorageCacheManager.instance = new SessionStorageCacheManager(options);
        return SessionStorageCacheManager.instance;
    }

}
