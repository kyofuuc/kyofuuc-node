
import { Encryptor } from "../../lib/encryptor";

export const Base64Encryptor: Encryptor<string, any> = {

    encrypt(value: string) {
        return Buffer.from(value).toString('base64');
    },

    decrypt(value: any): string {
        return Buffer.from(value, 'base64').toString('ascii');
    }

}
