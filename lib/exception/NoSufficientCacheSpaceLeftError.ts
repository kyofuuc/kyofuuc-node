
export class NoSufficientCacheSpaceLeftError extends Error {

    constructor(required: number, used: number, available: number) {
        super(`No sufficient space left in the cache manager. Required=${required}, Used=${used}, Available=${available}`);
        Object.setPrototypeOf(this, NoSufficientCacheSpaceLeftError.prototype);
    }
    
}
