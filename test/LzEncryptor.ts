
import lzString from "lz-string";
import { Encryptor } from "../lib/encryptor";

export const LzEncryptor: Encryptor<string, any> = {

    encrypt(value: string) {
        return lzString.compress(value);
    },

    decrypt(value: any): string {
        return lzString.decompress(value);
    }

}
