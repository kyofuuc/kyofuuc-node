
import { HandlerType } from "../../core";
import classes from "../../helper/node_classes";
import { Defaults, ErrorCode, KyofuucObject, Utils } from "../../helper";
import { HttpConfig, Response, RequestType, QueueRequest, CompressionProcessor, ResponseType, transformResponseData, transformRequestData } from "../../types";

// TODO treat proxy
// TODO treat cancellation
export default function httpConnector(config: HttpConfig, queueRequest?: QueueRequest): Promise<Response> {
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
        if (config.auth && headerNamesMap.authorization) {
            delete headers[headerNamesMap.authorization];
        }
        if (config.bearer && !headerNamesMap.authorization) {
            headers["Authorization"] = `Bearer ${config.bearer}`;
        }
        if (config.xsrf) {
            const xsrfValue = (config.xsrf.cookieName ? Utils.getCookie((document ?? {}), config.xsrf.cookieName) : undefined) ?? config.xsrf.value;
            headers[config.xsrf.headerName] = xsrfValue;
        }
        let isHttpsRequest = config.parsed?.protocol === "https";
        let agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;

        const options: KyofuucObject<any> = {
            agent,
            headers,
            method: config.method!,
            path: config.parsed?.pathname,
            auth: Utils.stringifyAuth(config.auth),
            maxBodyLength: config.maxContentLength,
            withCredentials: config.withCredentials,
            insecureHTTPParser: config.insecureHTTPParser,
            agents: { http: config.httpAgent, https: config.httpsAgent },
        };
        if (config.socketPath) {
            options.socketPath = config.socketPath;
        } else {
            options.port = config.parsed?.port;
            options.hostname = config.parsed?.hostname;
        }

        const redirectsResponses: any[] = [];
        const transport = (config.transport ?? (isHttpsRequest ? classes.https : classes.http));

        function processResponse(res: any, lastReq: any, onSuccess: (result: Response) => void, onError: (error: Error) => void, finalRequest: boolean = false) {
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
            let totalResponseBytes = 0;
            let responseBuffer: any[] = [];
            res.on('data', (chunk: any) => {
                responseBuffer.push(chunk);
                totalResponseBytes += chunk.length;
                if (config.maxContentLength && totalResponseBytes > config.maxContentLength) {
                    // stream.destoy() emit aborted event before calling reject() on Node.js v16
                    rejected = true;
                    res.destroy();
                    onError(Utils.kyofuucError('Max content length of ' + config.maxContentLength + ' exceeded',
                        config, ErrorCode.RESPONSE_EXCEEDS_MAXIMUM_LENGTH, lastReq));
                }
            });
            res.on('aborted', function handlerStreamAborted() {
                if (rejected) {
                    return;
                }
                res.destroy();
                onError(Utils.kyofuucError("Request aborted", config, ErrorCode.REQUEST_ABORTED, lastReq));
            });
            res.on('error', function handleStreamError(err: any) {
                if (lastReq.aborted) return;
                onError(Utils.kyofuucError(err, config, ErrorCode.RESPONSE_STREAM_ERROR, lastReq));
            });
            res.on('end', function handleStreamEnd() {
                try {
                    let responseData = responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer);
                    if (config.responseType !== ResponseType.ARRAY_BUFFER) {
                        responseData = responseData.toString(config.responseEncoding);
                        if (!config.responseEncoding || config.responseEncoding === 'utf8') {
                            responseData = Utils.stripBOM(responseData);
                        }
                    }
                    response.body = responseData;
                    transformResponseData(config, response, responseData, onSuccess, onError);
                } catch (err: any) {
                    onError(Utils.kyofuucError(err, config, ErrorCode.RESPONSE_DATA_PROCESSING_FAILED, response.request, response as Response));
                }
            });
        }

        function transportRequest(redirectCount: number) {
            const req = transport.request(options, (res: any) => {
                if (req.aborted || rejected) return;
                const lastReq = res.req ?? req;

                // handle redirects
                if ((res.statusCode === 301 || res.statusCode === 302) && res.headers['location']) {
                    const newLocation = res.headers['location'];
                    if (config.maxRedirects && (++redirectCount) <= config.maxRedirects) {
                        if (!config.socketPath) {
                            const parsed = Utils.parseUrl(newLocation);
                            options.port = parsed.port;
                            options.path = parsed.pathname;
                            options.hostname = parsed.hostname;
                        }
                        if (config.storeRedirectsResponses) {
                            const resolveRedirectResponse = (result: Response | Error) => {
                                redirectsResponses.push(result);
                                req.abort();
                            };
                            processResponse(res, lastReq, resolveRedirectResponse, resolveRedirectResponse);
                        } else {
                            req.abort();
                        }
                        transportRequest(redirectCount);
                        return;
                    }
                    config.interceptor?.invoke(HandlerType.HTTP_REQUEST_MAXIMUM_REDIRECTS_REACHED, config, redirectsResponses);
                }

                // handle decompression
                if (res.statusCode !== 204 && lastReq.method !== 'HEAD' && config.decompress) {
                    try {
                        res = res.pipe(CompressionProcessor.transform(res.headers['content-encoding'], "decompress"));
                        delete res.headers['content-encoding'];
                    } catch (err: any) {
                        return reject(Utils.kyofuucError(err.message, config, ErrorCode.RESPONSE_DECOMPRESSION_ENCODING_INVALID));
                    }
                }

                // handle response
                processResponse(res, lastReq, (result: Response) => {
                    if (config.storeRedirectsResponses) {
                        result.redirectsResponses = redirectsResponses;
                    }
                    Utils.resolveResponse(result, resolve, reject);
                }, reject, true);
            });

            req.on('error', (error: any) => {
                if (req.aborted && error.code !== 'ERR_FR_TOO_MANY_REDIRECTS') return;
                if (error.code && error.code === "ECONNREFUSED" && config.retry) {
                    if (config.retryCount! >= config.maxRetry!) {
                        reject(Utils.kyofuucError(error, config, ErrorCode.MAXIMUM_RETRY_EXCEEDED, req));
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
                };
                reject(Utils.kyofuucError(error, config, ErrorCode.REQUEST_ERROR, req));
            });

            req.on('socket', (socket: any) => {
                if (config.socketKeepAlive) {
                    socket.setKeepAlive(true, config.socketKeepAlive);
                }
            });

            if (config.timeout) {
                req.setTimeout(config.timeout, () => {
                    req.abort();
                    reject(Utils.kyofuucError('Timeout of ' + config.timeout + 'ms exceeded', config, ErrorCode.REQUEST_TIMEOUT, req));
                });
            }

            if (Utils.isStream(data)) {
                if (!(data = transformRequestData(config, data, !headerNamesMap['content-type'], headers, reject))) return;
                const stream = (data as any).on('error', (err: any) => {
                    reject(Utils.kyofuucError(err, config, ErrorCode.REQUEST_DATA_TRANSFORMATION_FAILED, req));
                }).pipe(req);
                if (config.encoding) {
                    try {
                        headers['Content-Encoding'] = config.encoding;
                        stream.pipe(CompressionProcessor.transform(config.encoding, "compress"));
                    } catch (err: any) {
                        return reject(Utils.kyofuucError(err.message, config, ErrorCode.REQUEST_COMPRESSION_ENCODING_INVALID));
                    }
                }
            } else {
                req.end(data);
            }
            if (redirectCount === 0) {
                config.interceptor?.invoke(HandlerType.HTTP_POST_REQUEST, config);
            }
        }
        transportRequest(0);
    });
}

module.exports = httpConnector;
