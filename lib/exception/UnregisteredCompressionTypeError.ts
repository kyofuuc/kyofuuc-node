
import { Flow } from "../types";

export class UnregisteredCompressionTypeError extends Error {

    constructor(type: string, flow: Flow) {
        super("No request transformer registered for the compression " + flow + " type: " + type);
        Object.setPrototypeOf(this, UnregisteredCompressionTypeError.prototype);
    }
    
}
