
import { KyofuucEnvironment, Utils } from "./Utils";
import { HttpConfig, Method, WsConfig } from "../types";

export const Defaults = {

    classes: null,
    VERSION: "0.0.3",
    INDEXDB_VERSION: 1,
    MaxObjectEntrySize: 999999,
    ENVIRONMENT: KyofuucEnvironment.AUTO,
    MaxCookieLength: 3800, // 3800 Bytes
    INDEXDB_DEFAULT_STORE_NAME: "KYOFUUC_CACHE",
    MaxStorageSpace: 5120000, // 5000 * 1024 = 5MB
    INDEXDB_DEFAULT_MAX_SIZE: 1024000000, // 1000000 * 1024 = 1GB

    defaultHttpConnector() {
        let connector;
        if (Defaults.ENVIRONMENT === KyofuucEnvironment.BROWSER || (Defaults.ENVIRONMENT === KyofuucEnvironment.AUTO && typeof XMLHttpRequest !== 'undefined')) {
            connector = require('../connector/http/xhrConnector');
        } else if (Defaults.ENVIRONMENT === KyofuucEnvironment.NODE || typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
            connector = require('../connector/http/httpConnector');
        }
        return connector;
    },

    getDefaultWSConnector() {
        let connector = require('../connector/ws/wsConnector');
        return connector;
    },

    wsConfig(config: WsConfig) {
        if (config.connector === undefined) config.connector = Defaults.getDefaultWSConnector();
        return config;
    },

    httpConfig(config: HttpConfig) {
        if (!Defaults.classes) Defaults.classes = require("../helper/shadows/classes");
        if (config.cache === undefined) config.cache = false;
        if (config.maxRetry === undefined) config.maxRetry = 99999;
        if (config.retryCount === undefined) config.retryCount = 0;
        if (config.method === undefined) config.method = Method.GET;
        if (config.maxRedirects === undefined) config.maxRedirects = 5;
        if (config.responseEncoding === undefined) config.responseEncoding = "utf8";
        if (config.timeout === undefined) config.timeout = 1000 * 60 * 5; // 5 minutes
        if (config.connector === undefined) config.connector = Defaults.defaultHttpConnector();
        if (Utils.envIsNodeJs() && (Defaults.classes as any)?.http) {
            if (!config.httpAgent) config.httpAgent = new (Defaults.classes as any).http.Agent({ keepAlive: true });
            if (!config.httpsAgent) config.httpsAgent = new (Defaults.classes as any).https.Agent({ keepAlive: true });
        }
        if (config.validateStatus === undefined) config.validateStatus = (status: number) => {
            return status >= 100 && status < 300;
        };
        return config;
    },

}

if (Defaults.ENVIRONMENT === KyofuucEnvironment.AUTO) {
    Defaults.ENVIRONMENT = (typeof window === "undefined" ? KyofuucEnvironment.NODE : KyofuucEnvironment.BROWSER);
}