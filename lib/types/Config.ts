
import { Response } from "./Response";
import { Interceptor } from "../core";
import { KyofuucObject } from "../helper";
import { CacheManager } from "../cachemanager";

export interface WsConnection {

    url?: string;
    name: string;
    close(): void;
    protocol?: string;
    readyState?: number;
    binaryType?: string;
    bufferedAmount?: number;
    send(message: any): void;
    addEventListener(evt: string, cb: Function): void;

}

export type QueueRequest = (config: Config) => void;
export type WsConnector = (config: WsConfig) => WsConnection;
export type QuerySerializer = (query: KyofuucObject<any>) => string;
export type HttpConnector = (config: Config, retryRequest?: QueueRequest) => Promise<any>;

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
    requestType?: string;
    promiscuous?: boolean;
    responseType?: string;
    interceptor?: Interceptor;
    querySerializer?: QuerySerializer;
    query?: KyofuucObject<any> | URLSearchParams;
    dynamicConfig?: (existingConfig: Config | HttpConfig | WsConfig) => Config | HttpConfig | WsConfig;

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
    isResource?: boolean;
    maxRedirects?: number;
    refreshCache?: boolean;
    cacheLifetime?: number;
    persistCache?: boolean;
    subscriptionKey?: string;
    socketKeepAlive?: number;
    insecureHTTPParser?: any;
    connector?: HttpConnector;
    maxContentLength?: number;
    withCredentials?: boolean;
    responseEncoding?: string;
    cacheManager?: CacheManager<any>;
    storeRedirectsResponses?: boolean;
    validateStatus?: (status: number) => boolean;
    onUploadProgress?: (...params: any[]) => any;
    onDownloadProgress?: (...params: any[]) => any;
    headers?: KyofuucObject<number | string | string[]>;
    cache?: boolean | ((config?: Config, type?: "REQUEST" | "RESPONSE", response?: Response) => boolean);
    xsrf?: {
        value?: any;
        headerName: string;
        cookieName?: string;
    };

} & Config;

export type WsConfig = {

    protocol?: string;
    reconnect?: boolean;
    maxReconnect?: number;
    connector?: WsConnector;
    reconnectInterval?: number;
    reconnectIntervalByPower?: boolean;

} & Config;
