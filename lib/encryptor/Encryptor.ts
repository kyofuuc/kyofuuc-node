
export type Encryptor<T1, T2> = {
    encrypt(value: T1): T2;
    decrypt(value: T2): T1;
};
