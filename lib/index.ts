
import {
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
} from "./types";
import {
    Http,
    IHttp,
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

export class Ffs implements IHttp {

    Http = Http;
    Method = Method;
    private _http: IHttp;
    EventQueue = EventQueue;
    RequestType = RequestType;
    Interceptor = Interceptor;
    HandlerType = HandlerType;
    ResponseType = ResponseType;
    EventQueueType = EventQueueType;
    MapCacheManager = MapCacheManager;
    CompressionType = CompressionType;
    RequestProcessor = RequestProcessor;
    ResponseProcessor = ResponseProcessor;
    MissingCacheError = MissingCacheError;
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
        this._http = new Http(config); 
    }

    static init(config?: HttpConfig | WsConfig) {
        return new Ffs(config);
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

}

export const ffs = new Ffs();

export default ffs;
module.exports = ffs;
module.exports.default = ffs;