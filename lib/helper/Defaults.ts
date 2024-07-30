
import { Utils } from "./Utils";
import { HttpConfig, Method } from "../types";
const classes = require("../helper/node_classes");

export const Defaults = {

    VERSION: "0.0.4",
    MaxObjectEntrySize: 999999,
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

    /*getDefaultWSConnector() {
        let connector = require('../connector/ws/wsConnector');
        return connector;
    },*/

    httpConfig(config: HttpConfig) {
        if (!config.timeout) config.timeout = 5000;
        if (!config.maxRetry) config.maxRetry = 99999;
        if (!config.retryCount) config.retryCount = 0;
        if (!config.method) config.method = Method.GET;
        if (!config.maxRedirects) config.maxRedirects = 5;
        if (!config.responseEncoding) config.responseEncoding = "utf8";
        if (!config.connector) config.connector = Defaults.defaultHttpConnector();
        if (Utils.envIsNodeJs() && classes.http) {
            if (!config.httpAgent) config.httpAgent = new classes.http.Agent({ keepAlive: true });
            if (!config.httpsAgent) config.httpsAgent = new classes.https.Agent({ keepAlive: true });
        }
        if (!config.validateStatus) config.validateStatus = (status: number) => {
            return status >= 100 && status < 300;
        };
        return config;
    },

}
