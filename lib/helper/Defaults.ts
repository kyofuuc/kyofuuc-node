
import { Utils } from "./Utils";
const classes = require("../helper/node_classes");
import { HttpConfig, Method, WsConfig } from "../types";

export const Defaults = {

    VERSION: "0.0.4",
    MaxObjectEntrySize: 999999,
    MaxCookieLength: 3800, // 3800 Bytes
    MaxStorageSpace: 5120000, // 5000 * 1024 = 5MB

    defaultHttpConnector() {
        let connector;
        if (typeof XMLHttpRequest !== 'undefined') {
            connector = require('../connector/http/xhrConnector');
        } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
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
        if (config.timeout === undefined) config.timeout = 5000;
        if (config.maxRetry === undefined) config.maxRetry = 99999;
        if (config.retryCount === undefined) config.retryCount = 0;
        if (config.method === undefined) config.method = Method.GET;
        if (config.maxRedirects === undefined) config.maxRedirects = 5;
        if (config.responseEncoding === undefined) config.responseEncoding = "utf8";
        if (config.connector === undefined) config.connector = Defaults.defaultHttpConnector();
        if (Utils.envIsNodeJs() && classes.http) {
            if (!config.httpAgent) config.httpAgent = new classes.http.Agent({ keepAlive: true });
            if (!config.httpsAgent) config.httpsAgent = new classes.https.Agent({ keepAlive: true });
        }
        if (config.validateStatus === undefined) config.validateStatus = (status: number) => {
            return status >= 100 && status < 300;
        };
        return config;
    },

}
