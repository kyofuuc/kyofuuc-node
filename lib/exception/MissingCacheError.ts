
export class MissingCacheError extends Error {

    constructor() {
        super("Missing cache, cache is required for this operation");
        Object.setPrototypeOf(this, MissingCacheError.prototype);
    }
    
}
