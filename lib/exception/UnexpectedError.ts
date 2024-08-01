
export class UnexpectedError extends Error {

    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, UnexpectedError.prototype);
    }
    
}
