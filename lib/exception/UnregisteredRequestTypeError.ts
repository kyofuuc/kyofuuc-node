
export class UnregisteredRequestTypeError extends Error {

    constructor(type: string) {
        super("No request transformer registered for the request type: " + type);
        Object.setPrototypeOf(this, UnregisteredRequestTypeError.prototype);
    }
    
}
