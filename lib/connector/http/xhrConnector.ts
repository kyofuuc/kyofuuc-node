
import { HandlerType } from "../../core";
import classes from "../../helper/node_classes";
import { Defaults, ErrorCode, KyofuucObject, Utils } from "../../helper";
import { HttpConfig, QueueRequest, RequestType, Response, ResponseType, transformRequestData, transformResponseData } from "../../types";

// TODO treat proxy
// TODO treat cancellation
export default function xhrConnector(config: HttpConfig, queueRequest?: QueueRequest): Promise<Response> {
    return new Promise((resolvePromise, rejectPromise) => {

        let rejected = false;

        function reject(error: any) {
            rejected = true;
            rejectPromise(error);
        }

        function resolve(response: Response) {
            if (rejected) return;
            if (response.__cached__) {
                config.interceptor?.invoke(HandlerType.HTTP_POST_REQUEST, config);
                config.interceptor?.invoke(HandlerType.HTTP_PRE_RESPONSE, config, response);
            }
            config.interceptor?.invoke(HandlerType.HTTP_POST_RESPONSE, config, response);
            resolvePromise(response);
        }

        const preRequestCachedResults = config.interceptor?.invoke(HandlerType.HTTP_PRE_REQUEST, config).filter((r) => r?.__cached__ === true);
        if (preRequestCachedResults?.length) {
            resolve(preRequestCachedResults[0] as Response);
            return;
        }

        const headers = config.headers ?? {};
        let data: Buffer | undefined = config.data;
        const headerNamesMap = Object.keys(headers).reduce((acc: KyofuucObject<string>, header: string) => {
            acc[header.toLowerCase()] = header;
            return acc;
        }, {});
        if (!Utils.envIsBrowser() && !('user-agent' in headerNamesMap)) {
            headers['User-Agent'] = `kyofuuc/${Defaults.VERSION}`;
        } else {
            if (!headers[headerNamesMap['user-agent']]) {
                delete headers[headerNamesMap['user-agent']];
            }
        }

        if (data && !Utils.isStream(data)) {
            if (!config.requestType) {
                if (Utils.isString(data)) {
                    config.requestType = RequestType.TEXT;
                } else if (Utils.isFormData(data)) {
                    config.requestType = RequestType.FORM_DATA;
                } else if (Utils.isURLSearchParams(data)) {
                    config.requestType = RequestType.URL_SEARCH_PARAMS;
                } else if (Utils.isPlainObject(data) || Utils.isObject(data) || Utils.isArray(data)) {
                    config.requestType = RequestType.JSON;
                } else if (Utils.isArrayBuffer(data)) {
                    config.requestType = RequestType.ARRAY_BUFFER;
                } else if (Buffer.isBuffer(data)) {
                    config.requestType = RequestType.BUFFER;
                } else {
                    return reject(Utils.kyofuucError('Request data after must be one of these ArrayBuffer, string, Stream, Form Data, Json Object, URLSearchParams, or Buffer',
                        config, ErrorCode.INVALID_REQUEST_TYPE));
                }
            }
            if (!(data = transformRequestData(config, data, !headerNamesMap['content-type'], headers, reject))) return;
            if (config.maxContentLength && data.length > config.maxContentLength) {
                return reject(Utils.kyofuucError('Request body larger than max content length limit', config, ErrorCode.REQUEST_EXCEEDS_MAXIMUM_LENGTH));
            }

            if (!headerNamesMap['content-length']) {
                headers['Content-Length'] = data.length;
            }
        }
        if (config.bearer && !headerNamesMap.authorization) {
            headers["Authorization"] = `Bearer ${config.bearer}`;
        }
        if (config.auth && !headerNamesMap.authorization) {
            headers["Authorization"] = `Basic ${Utils.toBase64(Utils.stringifyAuth(config.auth)!)}`;
        }

        const redirectsResponses: any[] = [];

        function processResponse(res: any, lastReq: any, onSuccess: (result: Response) => void, onError: (error: Error) => void, finalRequest: boolean = false) {
            const responseLength = Utils.length(res.responseData);
            if (config.maxContentLength && responseLength > config.maxContentLength) {
                rejected = true;
                onError(Utils.kyofuucError('Max content length of ' + config.maxContentLength + ' exceeded', config, ErrorCode.RESPONSE_EXCEEDS_MAXIMUM_LENGTH, lastReq));
                return;
            }
            const response: Partial<Response> = {
                config,
                request: lastReq,
                __cached__: false,
                headers: res.headers,
                status: res.statusCode,
                statusText: res.statusMessage,
            };
            if (finalRequest) {
                config.interceptor?.invoke(HandlerType.HTTP_PRE_RESPONSE, config, res);
            }
            if (!config.responseType) {
                const contentType = (response.headers ?? {})['content-type'] as string;
                if (contentType?.includes("json")) {
                    config.responseType = ResponseType.JSON;
                } else if (contentType?.includes("octet-stream")) {
                    config.responseType = ResponseType.STREAM;
                } else {
                    config.responseType = ResponseType.TEXT;
                }
            }
            if (config.responseType === ResponseType.STREAM) {
                response.body = res;
                transformResponseData(config, response, res, onSuccess, onError);
                return;
            }
            try {
                let responseData = res.responseData;
                if (config.responseType === ResponseType.STREAM || config.responseType === ResponseType.BUFFER || config.responseType === ResponseType.ARRAY_BUFFER) {
                    responseData = Buffer.from(responseData, 'utf8');
                }
                response.body = responseData;
                transformResponseData(config, response, responseData, onSuccess, onError);
            } catch (err: any) {
                onError(Utils.kyofuucError(err, config, ErrorCode.RESPONSE_DATA_PROCESSING_FAILED, response.request, response as Response));
            }
        }

        function transportRequest(redirectCount: number) {
            let manuallyAborted = false;
            const req: XMLHttpRequest = new classes.XMLHttpRequest();
            req.open(config.method!.toUpperCase(), config.url!, true);

            function onLoadEnd(onProcess?: (res: Response) => void) {
                let responseHeaders: KyofuucObject<number | string | string[]> = 'getAllResponseHeaders' in req ? Utils.parseHeaders(req.getAllResponseHeaders()) : {};

                // handle redirects
                if (!onProcess && (req.status === 301 || req.status === 302) && responseHeaders['location']) {
                    const newLocation = responseHeaders['location'] as string;
                    if (config.maxRedirects && (++redirectCount) <= config.maxRedirects) {
                        manuallyAborted = true;
                        config.url = newLocation;
                        if (config.storeRedirectsResponses) {
                            const resolveRedirectResponse = (result: Response | Error) => {
                                redirectsResponses.push(result);
                                req.abort();
                            };
                            processResponse({
                                statusCode: req.status,
                                headers: responseHeaders,
                                statusMessage: req.statusText,
                                responseData: req.response ?? req.responseText ?? req.responseXML,
                            }, req, resolveRedirectResponse, resolveRedirectResponse);
                        } else {
                            req.abort();
                        }
                        transportRequest(redirectCount);
                        return;
                    }
                    config.interceptor?.invoke(HandlerType.HTTP_REQUEST_MAXIMUM_REDIRECTS_REACHED, config, redirectsResponses);

                }

                // handle decompression - TODO

                // handle response
                processResponse({
                    statusCode: req.status,
                    headers: responseHeaders,
                    statusMessage: req.statusText,
                    responseData: req.response ?? req.responseText ?? req.responseXML,
                }, req, (result: Response) => {
                    if (onProcess) {
                        onProcess(result);
                        return;
                    }
                    if (config.storeRedirectsResponses) {
                        result.redirectsResponses = redirectsResponses;
                    }
                    Utils.resolveResponse(result, resolve, reject);
                }, reject, true);
            }
            if ("onloadend" in req) {
                req.onloadend = () => onLoadEnd();
            } else if ("onreadystatechange" in req) {
                (req as any).onreadystatechange = () => {
                    if (!req || (req as any).readyState !== 4) {
                        return;
                    }
                    if ((req as any).status === 0 && !((req as any).responseURL && (req as any).responseURL.indexOf('file:') === 0)) {
                        return;
                    }
                    setTimeout(onLoadEnd);
                }
            }
            req.onerror = () => {
                if (config.retry) {
                    if (config.retryCount! >= config.maxRetry!) {
                        onLoadEnd((res: Response) => reject(Utils.kyofuucError("Maximum retry exceeded", config, ErrorCode.MAXIMUM_RETRY_EXCEEDED, req, res)));
                        return;
                    }
                    config.retryCount! += 1;
                    queueRequest && queueRequest(config);
                    const response: Response = {
                        config,
                        headers: {},
                        status: 150,
                        request: req,
                        __cached__: false,
                        statusText: "Awaiting Retry",
                    };
                    Utils.resolveResponse(response, resolve, reject);
                    return;
                }
                onLoadEnd((res: Response) => reject(Utils.kyofuucError(res.body ?? "Network error", config, ErrorCode.REQUEST_ERROR, req, res)));
            };
            req.onabort = () => {
                if (rejected || manuallyAborted) return;
                reject(Utils.kyofuucError("Request aborted", config, ErrorCode.REQUEST_ABORTED, req));
            };
            if (config.timeout) req.timeout = config.timeout;
            req.ontimeout = () => {
                reject(Utils.kyofuucError('Timeout of ' + config.timeout + 'ms exceeded', config, ErrorCode.REQUEST_TIMEOUT, req));
            };
            if (config.xsrf) {
                const xsrfValue = (config.xsrf.cookieName ? Utils.getCookie((document ?? {}), config.xsrf.cookieName) : undefined) ?? config.xsrf.value;
                headers[config.xsrf.headerName] = xsrfValue;
            }
            if (config.withCredentials) req.withCredentials = config.withCredentials;
            Utils.forEach(headers, (key: string, value: any) => {
                req.setRequestHeader(key, value);
            });
            if (config.onDownloadProgress) req.addEventListener("progress", config.onDownloadProgress);
            if (config.onUploadProgress) req.upload.addEventListener("progress", config.onUploadProgress);

            req.send(data);
            if (redirectCount === 0) {
                config.interceptor?.invoke(HandlerType.HTTP_POST_REQUEST, config);
            }
        }

        transportRequest(0);
    });
}

module.exports = xhrConnector;
