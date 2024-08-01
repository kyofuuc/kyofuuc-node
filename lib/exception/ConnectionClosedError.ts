
export class ConnectionClosedError extends Error {

    constructor(message?: string) {
        super(message ?? "The required connection has already been closed");
        Object.setPrototypeOf(this, ConnectionClosedError.prototype);
    }
    
}
