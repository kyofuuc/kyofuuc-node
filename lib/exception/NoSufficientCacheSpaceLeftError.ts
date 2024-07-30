
export class NoSufficientCacheSpaceLeftError extends Error {

    constructor() {
        super("No sufficient space left in the cache manager");
        Object.setPrototypeOf(this, NoSufficientCacheSpaceLeftError.prototype);
    }
    
}
