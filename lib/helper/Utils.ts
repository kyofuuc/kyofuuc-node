
import { Buffer } from 'buffer';
import { BasicAuth, Config, HttpConfig, QuerySerializer, Response } from "../types";

export type KyofuucObject<T> = { [index: string]: T; };

export enum KyofuucEnvironment {

    AUTO,
    NODE,
    BROWSER,

}

export enum ErrorCode {

    UNKNOWN_ERROR = "UNKNOWN_ERROR",
    REQUEST_ERROR = "REQUEST_ERROR",
    REQUEST_ABORTED = "REQUEST_ABORTED",
    REQUEST_TIMEOUT = "REQUEST_TIMEOUT",
    INVALID_REQUEST_TYPE = "INVALID_REQUEST_TYPE",
    RESPONSE_STREAM_ERROR = "RESPONSE_STREAM_ERROR",
    MAXIMUM_RETRY_EXCEEDED = "MAXIMUM_RETRY_EXCEEDED",
    RESPONSE_STREAM_ABORTED = "RESPONSE_STREAM_ABORTED",
    REQUEST_EXCEEDS_MAXIMUM_LENGTH = "REQUEST_EXCEEDS_MAXIMUM_LENGTH",
    RESPONSE_EXCEEDS_MAXIMUM_LENGTH = "RESPONSE_EXCEEDS_MAXIMUM_LENGTH",
    RESPONSE_DATA_PROCESSING_FAILED = "RESPONSE_DATA_PROCESSING_FAILED",
    REQUEST_DATA_TRANSFORMATION_FAILED = "REQUEST_DATA_TRANSFORMATION_FAILED",
    RESPONSE_DATA_TRANSFORMATION_FAILED = "RESPONSE_DATA_TRANSFORMATION_FAILED",
    REQUEST_COMPRESSION_ENCODING_INVALID = "REQUEST_COMPRESSION_ENCODING_INVALID",
    RESPONSE_STATUS_CODE_FAILED_VALIDATION = "RESPONSE_STATUS_CODE_FAILED_VALIDATION",
    RESPONSE_DECOMPRESSION_ENCODING_INVALID = "RESPONSE_DECOMPRESSION_ENCODING_INVALID",

}

const _ignoreHeadersDuplicateOf = [
    'age', 'authorization', 'content-length', 'content-type', 'etag',
    'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
    'last-modified', 'location', 'max-forwards', 'proxy-authorization',
    'referer', 'retry-after', 'user-agent'
];

export const Utils = {

    Buffer: Buffer,

    buildCacheKey(config: HttpConfig) {
        if (config.key) return config.key;
        const method = config.method ?? "ANY";
        const suffix = (config.isResource ? "_RESOURCE" : "_SINGLE");
        return `${config.url}_${method}_${suffix}`;
    },

    presentElseImport(item: any, actual: Function, fallback: Function) {
        if (item !== "undefined") return actual.call(actual);
        else return fallback.call(fallback);
    },

    safeStringify(obj: any, indent: number = 0) {
        let cache: any[] | null = [];
        const retVal = JSON.stringify(
            obj,
            (key, value) =>
                typeof value === "object" && value !== null
                    ? cache!.includes(value)
                        ? "[Circular]" // Duplicate reference found, discard key
                        : cache!.push(value) && value // Store value in our collection
                    : value,
            indent
        );
        cache = null;
        return retVal;
    },

    // https://stackoverflow.com/a/25812530/6626422
    getCalculateAndSetStorageSize(storage: Storage) {
        if (!storage) return 0;
        let size = storage.getItem("kyofuuc.calculated.storage.size");
        if (!size) {
            let i = 0;
            try {
                for (i = 250; i <= 10000000000; i += 250) {
                    storage.setItem('kyofuuc.calculated.storage.test', new Array((i * 1024) + 1).join('a'));
                }
                size = "10000000000";
            } catch (e) {
                size = `${i - 250}`;
                storage.removeItem('kyofuuc.calculated.storage.test');
                storage.setItem('size', size);
            }
        }
        return parseInt(size);
    },

    getStorageEntries(storage: Storage, cb: (key: string, value: any) => void) {
        const items = { ...storage };
        for (let key in items) {
            cb(key, items[key]);
        }
    },

    storageSpaceUsed(storage: Storage) {
        let used = 0;
        Utils.getStorageEntries(storage, (_: string, value: any) => {
            if (`${value}`.endsWith("#_kce_")) used += value.length;
        })
        return used
    },

    getCookieEntries(document: { cookie: string; }, cb: (key: string, value: string) => void) {
        const items = document.cookie.split(/; */);
        for (let item of items) {
            const cookieParts = item.split('=');
            cb(cookieParts[0], cookieParts[1]);
        }
    },

    cookieSpaceUsed(document: { cookie: string; }) {
        let used = 0;
        Utils.getCookieEntries(document, (key: string, value: string) => {
            if (`${value}`.endsWith("#_kce_")) used += (key.length + value.length);
        })
        return used
    },

    addCookie(document: { cookie: string; }, options: { name: string; value: string; expires?: Date; path?: string; }) {
        const path = options.path ?? "/";
        const expires = options.expires ? `; Expires=${options.expires.toUTCString()}` : "";
        document.cookie = options.name + "=" + (options.value ?? "") + expires + "; Path=" + path;
    },

    removeCookie(document: { cookie: string; }, name: string) {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    },

    getCookie(document: { cookie: string; }, name: string) {
        name = name + "=";
        let ca = document.cookie?.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return;
    },

    randomString(length: number = 10, characters: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") {
        let counter = 0;
        let result = '';
        const charactersLength = characters.length;
        while (counter < length) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
            counter += 1;
        }
        return result;
    },

    isArray(val: any) {
        return Array.isArray(val);
    },

    isURLSearchParams(val: any) {
        return toString.call(val) === '[object URLSearchParams]';
    },

    isDate(val: any) {
        return toString.call(val) === '[object Date]';
    },

    isObject(val: any) {
        return val !== null && typeof val === 'object';
    },

    forEach(obj: any, fn: Function) {
        if (obj === null || typeof obj === 'undefined') {
            return;
        }
        if (typeof obj !== 'object') {
            obj = [obj];
        }

        if (Utils.isArray(obj)) {
            for (let i = 0, l = obj.length; i < l; i++) {
                fn.call(null, i, obj[i], obj);
            }
        } else {
            for (let key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    fn.call(null, key, obj[key], obj);
                }
            }
        }
    },

    cherryPick(obj: KyofuucObject<any>, cherryPicks: string[], remove: boolean = false, rebuilds: KyofuucObject<string> = {}) {
        const picked = Object.keys(obj).reduce((acc: KyofuucObject<any>, key: any) => {
            if ((remove && !cherryPicks.includes(key)) || (!remove && cherryPicks.includes(key))) {
                acc[key] = (key in rebuilds ? rebuilds[key] : obj[key]);
            }
            return acc;
        }, {})
        return picked;
    },

    mergeObjects(obj1: KyofuucObject<any>, obj2: KyofuucObject<any>, cherryPicks?: string[]) {
        obj1 = obj1 ?? {};
        obj2 = obj2 ?? {};
        if ((obj1 === null || typeof obj1 === 'undefined') &&
            (obj2 === null || typeof obj2 === 'undefined')) {
            return {};
        }
        let merged: KyofuucObject<any> = {};
        if (typeof obj1 !== 'object' && typeof obj2 === 'object') {
            merged = obj2;
            return merged;
        }
        if (typeof obj2 !== 'object') {
            merged = obj1;
            return merged;
        }
        if (cherryPicks) {
            for (const cherryPick of cherryPicks) {
                if (cherryPick in obj2) merged[cherryPick] = obj2[cherryPick];
                else if (cherryPick in obj1) merged[cherryPick] = obj1[cherryPick];
            }
            return merged;
        }
        for (let key in obj2) { merged[key] = obj2[key]; }
        for (let key in obj1) {
            if (merged[key] === undefined || merged[key] === null) {
                merged[key] = obj1[key];
            }
        }
        return merged;
    },

    encodeParamURI(val: string) {
        return encodeURIComponent(val).
            replace(/%5B/gi, '[').
            replace(/%5D/gi, ']').
            replace(/%3A/gi, ':').
            replace(/%24/g, '$').
            replace(/%20/g, '+').
            replace(/%2C/gi, ',');
    },

    isAbsoluteURL(url: string) {
        return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
    },

    isRelativeURL(url: string) {
        return !Utils.isAbsoluteURL(url);
    },

    combineUrls(baseUrl: string, relativeUrl: string) {
        if (!baseUrl) return relativeUrl;
        return relativeUrl
            ? baseUrl.replace(/\/+$/, '') + '/' + relativeUrl.replace(/^\/+/, '')
            : baseUrl;
    },

    buildFullUrl(config: Config, stripAuth?: boolean) {
        let fullUrl = config.url ?? config.baseUrl;
        if (config.baseUrl && config.url && !Utils.isAbsoluteURL(config.url)) {
            fullUrl = Utils.combineUrls(config.baseUrl, config.url);
        }
        if (!fullUrl || !stripAuth) return fullUrl;
        return Utils.stripAuthFromUrl(fullUrl);
    },

    stripAuthFromUrl(fullUrl: string) {
        let zeroAtIndex = fullUrl.indexOf("@");
        const protocolIndex = fullUrl.indexOf("://");
        const authSeparatorIndex = fullUrl.indexOf(":", (protocolIndex > -1 ? (protocolIndex + 3) : 0));
        let atIndex = fullUrl.indexOf("@", (authSeparatorIndex > -1 ? (authSeparatorIndex + 1) : 0));
        if (atIndex === -1) atIndex = zeroAtIndex;
        if (atIndex === -1) return fullUrl;
        return fullUrl.substring(0, protocolIndex + (protocolIndex > -1 ? 3 : 0)) + fullUrl.substring(atIndex + 1);
    },

    buildUrlWithQuery(url: string, query: KyofuucObject<any> | URLSearchParams, querySerializer?: QuerySerializer) {
        let serializedQuery: string | undefined;

        if (Utils.isURLSearchParams(query)) {
            serializedQuery = query.toString();
        } else if (querySerializer) {
            serializedQuery = querySerializer(query);
        } else {
            let queryParts: string[] = [];
            Utils.forEach(query, function serialize(key: string, value: any) {
                if (value === null || typeof value === 'undefined') {
                    return;
                }
                if (Utils.isArray(value)) {
                    key = key + '[]';
                } else {
                    value = [value];
                }

                Utils.forEach(value, function parseValue(_: string, val: any) {
                    if (Utils.isDate(val)) {
                        val = val.toISOString();
                    } else if (Utils.isObject(val)) {
                        val = Utils.safeStringify(val);
                    }
                    queryParts.push(`${Utils.encodeParamURI(key)}=${Utils.encodeParamURI(val)}`);
                });
                serializedQuery = queryParts.join('&');
            });

        }

        if (serializedQuery) {
            var hashIndex = url.indexOf('#');
            if (hashIndex !== -1) {
                url = url.slice(0, hashIndex);
            }

            url += (url.indexOf('?') === -1 ? '?' : '&') + serializedQuery;
        }
        return url;
    },

    buildUrlWithQueryFromConfig(config: Config) {
        if (!config.url) return undefined;
        return Utils.buildUrlWithQuery(config.url, config.query ?? {}, config.querySerializer);
    },

    basicAuthFromUrl(fullUrl: string) {
        let atIndex = fullUrl.indexOf("@");
        if (atIndex === -1) return undefined;
        let doubleSlashIndex = fullUrl.indexOf("//") ?? -1;
        let hasDoubleSlashIndex = doubleSlashIndex > -1;
        const authParts = (fullUrl?.substring(doubleSlashIndex + (hasDoubleSlashIndex ? 2 : 0), fullUrl?.indexOf("@"))).split(":");
        return {
            username: encodeURIComponent(authParts.length > 0 ? authParts[0] : ""),
            password: encodeURIComponent(authParts.length > 1 ? authParts[1] : ""),
        };
    },

    parseUrl(url: string) {
        return new URL(url);
    },

    isFunction(val: any) {
        return toString.call(val) === '[object Function]';
    },

    isStream(val: any) {
        return Utils.isObject(val) && Utils.isFunction(val.pipe);
    },

    isString(val: any) {
        return typeof val === 'string';
    },

    isPlainObject(val: any) {
        if (toString.call(val) !== '[object Object]') {
            return false;
        }

        let prototype = Object.getPrototypeOf(val);
        return prototype === null || prototype === Object.prototype;
    },

    isArrayBuffer(val: any) {
        return toString.call(val) === '[object ArrayBuffer]';
    },

    isFormData(val: any) {
        return toString.call(val) === '[object FormData]';
    },

    kyofuucError(message: string | Error, config: Config, code: ErrorCode, request?: any, response?: Response) {
        let error = (typeof message === "string" ? new Error(message) : message) as any;
        error.config = config;
        error.request = request;
        error.response = response;
        error.isKyofuucError = true;

        error.toJSON = function toJSON() {
            return {
                name: this.name,
                stack: this.stack,
                config: this.config,
                number: this.number,
                message: this.message,
                fileName: this.fileName,
                lineNumber: this.lineNumber,
                description: this.description,
                status: this.response?.status,
                columnNumber: this.columnNumber,
                code: (code ? code : error.code),
                responseBody: this.response?.body,
            };
        };
        return error;
    },

    envIsNodeJs() {
        return (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]');
    },

    resolveResponse(response: Response, resolve: (result: Response) => void, reject: (result: Error) => void) {
        let validateStatus = response.config?.validateStatus;
        if (!response.status || !validateStatus || validateStatus(response.status)) {
            resolve(response);
        } else {
            reject(Utils.kyofuucError(
                'Request failed with status code ' + response.status, response.config,
                ErrorCode.RESPONSE_STATUS_CODE_FAILED_VALIDATION, response.request, response,
            ));
        }
    },

    toArrayBuffer(buffer: Buffer) {
        const arrayBuffer = new ArrayBuffer(buffer.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < buffer.length; ++i) {
            view[i] = buffer[i];
        }
        return arrayBuffer;
    },

    stripBOM(content: string) {
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }
        return content;
    },

    stringifyAuth(auth?: BasicAuth) {
        if (!auth) return undefined;
        return `${decodeURIComponent(auth.username)}:${decodeURIComponent(auth.password)}`;
    },

    envIsBrowser() {
        return !(typeof window === 'undefined');
    },

    toBase64(value: string) {
        if (Utils.envIsBrowser()) {
            return btoa(value);
        }
        return Buffer.from(value).toString('base64');
    },

    fromBase64(value: string) {
        if (Utils.envIsBrowser()) {
            return atob(value);
        }
        return Buffer.from(value, 'base64').toString();
    },

    trim(str: string) {
        return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
    },

    length(str: any) {
        return str.length ?? 0;
    },

    parseHeaders(headers: string) {
        let i;
        let key;
        let val;
        let parsed: KyofuucObject<any> = {};

        if (!headers) { return parsed; }

        Utils.forEach(headers.split('\n'), (_: string, line: string) => {
            i = line.indexOf(':');
            key = Utils.trim(line.substring(0, i)).toLowerCase();
            val = Utils.trim(line.substring(i + 1));

            if (key) {
                if (parsed[key] && _ignoreHeadersDuplicateOf.indexOf(key) >= 0) {
                    return;
                }
                if (key === 'set-cookie') {
                    parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
                } else {
                    parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
                }
            }
        });

        return parsed;
    },

    addMsToDate(date: Date, ms: number) {
        date.setMilliseconds(date.getMilliseconds() + ms);
        return date;
    },

    dateDiffInMs(date1: Date, date2: Date) {
        return date1.getTime() - date2.getTime();
    },

}
