
import { Response } from "../types";
import { Interceptor } from "./Interceptor";
import { HttpConfig, Method } from "../types";
import { EventQueue, EventQueueType } from "./EventQueue";
import { Defaults, KyofuucObject, Utils } from "../helper";
import { InvalidParameterError, MissingCacheError } from "../exception";
import { CacheManager, LocalStorageCacheManager, MapCacheManager, SessionStorageCacheManager } from "../cachemanager";

export interface IHttp {
    
    getUrl(config: HttpConfig): string;
    queueRequest(config: HttpConfig): void;
    get(url: string, config?: HttpConfig): Promise<any>;
    head(url: string, config?: HttpConfig): Promise<any>;
    retryRequests(cache?: CacheManager<any>): Promise<any>;
    delete(url: string, config?: HttpConfig): Promise<any>;
    options(url: string, config?: HttpConfig): Promise<any>;
    put(url: string, data: any, config?: HttpConfig): Promise<any>;
    post(url: string, data: any, config?: HttpConfig): Promise<any>;
    patch(url: string, data: any, config?: HttpConfig): Promise<any>;
    request(urlOrConfig: string | HttpConfig, config?: HttpConfig): Promise<any>;

}

export class Http implements IHttp {

    private _baseConfig: HttpConfig;
    protected static instance: Http;
    private _queueRebuilds = { cache: "__kyofuuc_rebuild__" };
    private _nonSerializable = ["interceptor", "connector", "parsed", "httpAgent", "httpsAgent", "validateStatus", "querySerializer", "transport"];

    constructor(baseConfig?: HttpConfig) {
        this._baseConfig = baseConfig ?? {};
        this.queueRequest = this.queueRequest.bind(this);
        this.retryRequests = this.retryRequests.bind(this);
    }

    static getInstance(baseConfig?: HttpConfig) {
        if (!Http.instance) Http.instance = new Http(baseConfig);
        return Http.instance;
    }

    getUrl(config: HttpConfig) {
        if (!config.url) {
            throw new InvalidParameterError("Invalid or missing url in config");
        }
        const mergedConfig = Utils.mergeObjects(this._baseConfig, config, ["url", "baseUrl", "query", "querySerializer"]) as HttpConfig;
        return Utils.buildUrlWithQueryFromConfig({
            query: mergedConfig.query,
            url: Utils.buildFullUrl(mergedConfig),
            querySerializer: mergedConfig.querySerializer,
        }) ?? config.url;
    }

    request(urlOrConfig: string | HttpConfig, config?: HttpConfig): Promise<any> {
        const interceptors: Interceptor[] = [];
        if (typeof urlOrConfig === 'string') {
            config = { ...(config ?? {}), url: urlOrConfig };
        } else {
            config = { ...(config ?? {}), ...(urlOrConfig ?? {}) };
        }
        if (config?.interceptor) interceptors.push(config.interceptor);
        if (this._baseConfig.interceptor) interceptors.push(this._baseConfig.interceptor);
        const mergedConfig = Defaults.httpConfig(Utils.mergeObjects(this._baseConfig, config ?? {}));
        const url = this.getUrl(mergedConfig);
        mergedConfig.parsed = Utils.parseUrl(url);
        mergedConfig.url = Utils.stripAuthFromUrl(url);
        mergedConfig.interceptor = new Interceptor(interceptors);
        if (mergedConfig.parsed.username || mergedConfig.parsed.password) {
            mergedConfig.auth = { username: mergedConfig.parsed.username, password: mergedConfig.parsed.password };
        }
        this._registerCacheInterceptors(mergedConfig);
        return mergedConfig.connector!(mergedConfig, this.queueRequest);
    }

    get(url: string, config?: HttpConfig): Promise<any> {
        return this.request(url, { ...(config ?? {}), method: Method.GET });
    }

    head(url: string, config?: HttpConfig): Promise<any> {
        return this.request(url, { ...(config ?? {}), method: Method.HEAD });
    }

    delete(url: string, config?: HttpConfig): Promise<any> {
        return this.request(url, { ...(config ?? {}), method: Method.DELETE });
    }

    options(url: string, config?: HttpConfig): Promise<any> {
        return this.request(url, { ...(config ?? {}), method: Method.OPTIONS });
    }

    put(url: string, data: any, config?: HttpConfig): Promise<any> {
        return this.request(url, { ...(config ?? {}), method: Method.PUT, data });
    }

    post(url: string, data: any, config?: HttpConfig): Promise<any> {
        return this.request(url, { ...(config ?? {}), method: Method.POST, data });
    }

    patch(url: string, data: any, config?: HttpConfig): Promise<any> {
        return this.request(url, { ...(config ?? {}), method: Method.PATCH, data });
    }

    queueRequest(config: HttpConfig) {
        if (!config.cache) {
            throw new MissingCacheError();
        }
        EventQueue.getInstance().queueEvent(config.cache, {
            type: EventQueueType.HTTP_REQUEST,
            subscriptionKey: config.subscriptionKey,
            params: [Utils.cherryPick(config, this._nonSerializable, true, this._queueRebuilds)],
        }, config.key);
    }

    async retryRequests(cache?: CacheManager<any>): Promise<any> {
        if (cache) {
            EventQueue.getInstance().execute(cache, EventQueueType.HTTP_REQUEST);
            return;
        }
        EventQueue.getInstance().execute(MapCacheManager.getInstance(), EventQueueType.HTTP_REQUEST);
        EventQueue.getInstance().execute(LocalStorageCacheManager.getInstance(), EventQueueType.HTTP_REQUEST);
        EventQueue.getInstance().execute(SessionStorageCacheManager.getInstance(), EventQueueType.HTTP_REQUEST);
    }

    private _registerCacheInterceptors(config: HttpConfig) {
        if (!config.cache) return;
        if (!config.refreshCache) {
            config.interceptor?.registerPreRequest((config?: HttpConfig) => {
                const cached = config?.cache?.get(config);
                console.log("THE DATE", cached?.date?.getTime(), ((new Date()).getTime() - (cached?.date?.getTime() ?? 0)), config?.cacheLifetime);
                if (!cached || (config?.cacheLifetime && cached?.date && ((new Date()).getTime() - cached.date.getTime()) >= config?.cacheLifetime)) {
                    if (cached && !config?.persistCache) config?.cache?.remove(config);
                    return;
                }
                return {
                    ...cached?.value,
                    __cached__: true,
                    __cached_expires_at__: cached?.date,
                };
            });
        }
        config.interceptor?.registerPostResponse((config?: HttpConfig, _?: KyofuucObject<any>, response?: Response) => {
            if (response?.__cached__ || response?.status === 150) return;
            config?.cache?.set(config, response);
        });
    }

}

if (!EventQueue.executorIsRegistered(EventQueueType.HTTP_REQUEST)) {
    EventQueue.registerExecutor(EventQueueType.HTTP_REQUEST, Http.getInstance().request.bind(Http.getInstance()));
    EventQueue.registerPreExecutor(EventQueueType.HTTP_REQUEST, (cache: CacheManager<any>, config: HttpConfig) => {
        config.cache = cache;
        return [config];
    });
}
