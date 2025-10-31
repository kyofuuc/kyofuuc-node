
import classes from "./helper/shadows/classes";
import xhrConnector from "./connector/http/xhrConnector";
import httpConnector from "./connector/http/httpConnector";
import {
    Utils,
    Defaults,
    KyofuucObject,
    KyofuucEnvironment,
} from "./helper";
import {
    Config,
    Method,
    WsConfig,
    HttpConfig,
    RequestType,
    ResponseType,
    CompressionType,
    RequestProcessor,
    ResponseProcessor,
    CompressionProcessor,

    transformRequestData,
    transformResponseData,
    WsConnection,
    WsConnector,
} from "./types";
import {
    Ws,
    IWs,
    Http,
    IHttp,
    WsState,
    EventQueue,
    Interceptor,
    HandlerType,
    EventQueueType,
} from "./core";
import {
    CacheManager,
    MapCacheManager,
    CookieCacheManager,
    StorageCacheManager,
    LocalStorageCacheManager,
    SessionStorageCacheManager,
} from "./cachemanager";
import {
    MissingCacheError,
    InvalidParameterError,
    NoEventFoundWithIdError,
    UnregisteredRequestTypeError,
    UnregisteredResponseTypeError,
    NoSufficientCacheSpaceLeftError,
} from "./exception";


export class Ffs implements IHttp, IWs {

    Ws = Ws;
    Ffs = Ffs;
    Http = Http;
    Utils = Utils;
    Method = Method;
    private _ws: IWs;
    WsState = WsState;
    Defaults = Defaults;
    http = classes.http;
    private _http: IHttp;
    https = classes.https;
    EventQueue = EventQueue;
    RequestType = RequestType;
    Interceptor = Interceptor;
    HandlerType = HandlerType;
    xhrConnector = xhrConnector;
    ResponseType = ResponseType;
    httpConnector = httpConnector;
    WebSocket = classes.WebSocket;
    EventQueueType = EventQueueType;
    MapCacheManager = MapCacheManager;
    CompressionType = CompressionType;
    RequestProcessor = RequestProcessor;
    ResponseProcessor = ResponseProcessor;
    MissingCacheError = MissingCacheError;
    XMLHttpRequest = classes.XMLHttpRequest;
    CookieCacheManager = CookieCacheManager;
    StorageCacheManager = StorageCacheManager;
    CompressionProcessor = CompressionProcessor;
    transformRequestData = transformRequestData;
    transformResponseData = transformResponseData;
    InvalidParameterError = InvalidParameterError;
    NoEventFoundWithIdError = NoEventFoundWithIdError;
    LocalStorageCacheManager = LocalStorageCacheManager;
    SessionStorageCacheManager = SessionStorageCacheManager;
    UnregisteredRequestTypeError = UnregisteredRequestTypeError;
    UnregisteredResponseTypeError = UnregisteredResponseTypeError;
    NoSufficientCacheSpaceLeftError = NoSufficientCacheSpaceLeftError;

    constructor(config?: HttpConfig | WsConfig) {
        this._ws = new Ws(config as WsConfig);
        this._http = new Http(config as HttpConfig);
    }

    static init(config?: HttpConfig | WsConfig) {
        return new Ffs(config);
    }

    init(config?: HttpConfig | WsConfig) {
        return Ffs.init(config);
    }

    setEnvironment(env: KyofuucEnvironment) {
        Defaults.ENVIRONMENT = env;
    }

    // http

    getConfig(type?: "HTTP" | "WS"): any {
        if (type === "WS") return this._ws.getConfig();
        return this._http.getConfig();
    }

    updateConfig(newConfig: Config | HttpConfig | WsConfig, merge?: boolean) {
        this._http.updateConfig(newConfig as HttpConfig, merge);
    }

    getUrl(config: HttpConfig): string {
        return this._http.getUrl(config);
    }

    queueRequest(config: HttpConfig): void {
        return this._http.queueRequest(config);
    }

    async retryRequests(cache?: CacheManager<any>): Promise<any> {
        return this._http.retryRequests(cache);
    }

    get(url: string, config?: HttpConfig | undefined): Promise<any> {
        return this._http.get(url, config);
    }

    head(url: string, config?: HttpConfig | undefined): Promise<any> {
        return this._http.head(url, config);
    }

    delete(url: string, config?: HttpConfig | undefined): Promise<any> {
        return this._http.delete(url, config);
    }

    options(url: string, config?: HttpConfig | undefined): Promise<any> {
        return this._http.options(url, config);
    }

    put(url: string, data: any, config?: HttpConfig | undefined): Promise<any> {
        return this._http.put(url, data, config);
    }

    post(url: string, data: any, config?: HttpConfig | undefined): Promise<any> {
        return this._http.post(url, data, config);
    }

    patch(url: string, data: any, config?: HttpConfig | undefined): Promise<any> {
        return this._http.patch(url, data, config);
    }

    request(urlOrConfig: string | HttpConfig, config?: HttpConfig | undefined): Promise<any> {
        return this._http.request(urlOrConfig, config);
    }

    // ws

    ws(config: WsConfig): IWs {
        return Ws.ws(config);
    }

    close(): void {
        return this._ws.close();
    }

    getState(): WsState {
        return this._ws.getState();
    }

    getBufferedAmount(): number {
        return this._ws.getBufferedAmount();
    }

    sendMessage(message: any): void {
        this._ws.sendMessage(message);
    }

    getLastReconnectionCount(): number {
        return this._ws.getLastReconnectionCount();
    }

    getBinaryType(): string | undefined {
        return this._ws.getBinaryType();
    }

    setBinaryType(binaryType: string): void {
        this._ws.setBinaryType(binaryType);
    }

    reconnect(connector?: WsConnector | undefined): IWs {
        return this._ws.reconnect(connector);
    }

    getConnection(): WsConnection | undefined {
        return this._ws.getConnection();
    }

    connect(urlOrConfig: string | WsConfig, config?: WsConfig | undefined): IWs {
        return this._ws.connect(urlOrConfig, config);
    }

    onOpen(cb: (ws: IWs, event: any, options?: KyofuucObject<any> | undefined) => void, options?: KyofuucObject<any> | undefined): void {
        this._ws.onOpen(cb, options);
    }

    onClose(cb: (ws: IWs, event: any, options?: KyofuucObject<any> | undefined) => void, options?: KyofuucObject<any> | undefined, always?: boolean): void {
        this._ws.onClose(cb, options, always);
    }

    onError(cb: (ws: IWs, error: Error, options?: KyofuucObject<any> | undefined) => void, options?: KyofuucObject<any> | undefined): void {
        this._ws.onError(cb, options);
    }

    onStateChange(cb: (ws: IWs, state: WsState, options?: KyofuucObject<any> | undefined) => void, options?: KyofuucObject<any> | undefined): void {
        this._ws.onStateChange(cb, options);
    }

    onMessage(cb: (ws: IWs, event: any, message: any, options?: KyofuucObject<any> | undefined) => void, options?: KyofuucObject<any> | undefined): void {
        this._ws.onMessage(cb, options);
    }

}

export * from "./core";
export * from "./types";
export * from "./helper";
export * from "./exception";
export * from "./cachemanager";
export * from "./connector/http/xhrConnector";
export * from "./connector/http/httpConnector";

export const ffs = new Ffs();

export default ffs;
module.exports = ffs;
module.exports.default = ffs;