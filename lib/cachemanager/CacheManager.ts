
import { HttpConfig } from "../types";
import { Encryptor } from "../encryptor";

export type CacheManagerOption<T1, T2, T3 = any> = {
    bucket?: T3;
    encryptKey?: boolean;
    encryptor?: Encryptor<T1, T2>;
}

export interface CacheManager<T> {

    clear(): Promise<void>;
    usedSpace(): Promise<number>;
    availableSpace(): Promise<number>;
    find(cond: (key: string) => boolean): Promise<string[]>;
    has(configOrKey: string | HttpConfig): Promise<boolean>;
    set(configOrKey: string | HttpConfig, value: T): Promise<void>;
    getValue(configOrKey: string | HttpConfig): Promise<T | undefined>;
    calculateSpace(configOrKey: string | HttpConfig, value: T): Promise<number>;
    get(configOrKey: string | HttpConfig): Promise<{ date: Date; value: T; } | undefined>;
    remove(configOrKey: string | HttpConfig, resolve?: { exists: boolean; key: string; }): Promise<void>;

}
