
import { Method } from "./Method";
import { Interceptor } from "../core";
import { KyofuucObject } from "../helper";
import { CacheManager } from "../cachemanager";

export type QueueRequest = (config: Config) => void;
export type QuerySerializer = (query: KyofuucObject<any>) => string;
export type Connector = (config: Config, retryRequest?: QueueRequest) => Promise<any>;

export interface BasicAuth {

    username: string;
    password: string;

}

export interface Config {

    parsed?: URL;
    key?: string;
    url?: string;
    transport?: any;
    auth?: BasicAuth;
    baseUrl?: string;
    querySerializer?: QuerySerializer;
    query?: KyofuucObject<any> | URLSearchParams;

}

export type HttpConfig = {

    data?: any;
    extra?: any;
    method?: string;
    retry?: boolean;
    bearer?: string;
    httpAgent?: any;
    httpsAgent?: any;
    timeout?: number;
    maxRetry?: number;
    encoding?: string;
    retryCount?: number;
    socketPath?: string;
    decompress?: boolean;
    requestType?: string;
    isResource?: boolean;
    maxRedirects?: number;
    connector?: Connector;
    responseType?: string;
    refreshCache?: boolean;
    cacheLifetime?: number;
    subscriptionKey?: string;
    socketKeepAlive?: number;
    insecureHTTPParser?: any;
    maxContentLength?: number;
    withCredentials?: boolean;
    interceptor?: Interceptor;
    cache?: CacheManager<any>;
    responseEncoding?: string;
    storeRedirectsResponses?: boolean;
    validateStatus?: (status: number) => boolean;
    headers?: KyofuucObject<number | string | string[]>;

} & Config;

export type WsConfig = {

} & Config;

