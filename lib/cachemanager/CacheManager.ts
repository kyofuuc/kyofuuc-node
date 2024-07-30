
import { HttpConfig } from "../types";
import { Encryptor } from "../encryptor";

export type CacheManagerOption<T1, T2> = {
    bucket?: any;
    encryptKey?: boolean;
    encryptor?: Encryptor<T1, T2>;
}

export interface CacheManager<T> {

    clear(): void;
    usedSpace(): number;
    availableSpace(): number;
    calculateSpace(value: T): number;
    find(cond: (key: string) => boolean): string[];
    has(configOrKey: string | HttpConfig): boolean;
    remove(configOrKey: string | HttpConfig): void;
    set(configOrKey: string | HttpConfig, value: T): void;
    getValue(configOrKey: string | HttpConfig): T | undefined;
    get(configOrKey: string | HttpConfig): { date: Date; value: T; } | undefined;

}
