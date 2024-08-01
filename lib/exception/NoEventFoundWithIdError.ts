
export class NoEventFoundWithIdError extends Error {

    constructor(id: string) {
        super("No queued event found with the specified id: " + id);
        Object.setPrototypeOf(this, NoEventFoundWithIdError.prototype);
    }
    
}
