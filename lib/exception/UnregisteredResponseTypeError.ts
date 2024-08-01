
export class UnregisteredResponseTypeError extends Error {

    constructor(type: string) {
        super("No response transformer registered for the response type: " + type);
        Object.setPrototypeOf(this, UnregisteredResponseTypeError.prototype);
    }
    
}
