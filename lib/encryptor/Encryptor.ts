
export type Encryptor<T1, T2> = {
    encrypt(value: T1, base64?: boolean): T2;
    decrypt(value: T2, base64?: boolean): T1;
};
