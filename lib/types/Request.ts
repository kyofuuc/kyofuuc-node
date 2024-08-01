
import { Stream } from "stream";
import { Config } from "./Config";
import { ErrorCode, KyofuucObject, Utils } from "../helper";
import { UnexpectedError, UnregisteredRequestTypeError } from "../exception";

export const RequestType = {

    TEXT: "TEXT",
    JSON: "JSON",
    STREAM: "STREAM",
    BUFFER: "BUFFER",
    FORM_DATA: "FORM_DATA",
    ARRAY_BUFFER: "ARRAY_BUFFER",
    URL_SEARCH_PARAMS: "URL_SEARCH_PARAMS",

}

export type RequestTransformer = (data: any) => { buffer: Buffer; contentType: string; };

export interface Request {

    key?: string;
    url?: string;
    __cached__?: boolean;
    __cached_expires_at__?: Date;

}

export function textRequestTransformer(data: string) {
    return {
        contentType: "text/html",
        buffer: Buffer.from(data, 'utf-8'),
    };
}

export function jsonRequestTransformer(data: object) {
    return {
        contentType: "application/json",
        buffer: Buffer.from(Utils.safeStringify(data), 'utf-8'),
    };
}

export function bufferRequestTransformer(data: Buffer) {
    return {
        buffer: data,
        contentType: "application/octet-stream",
    };
}

export function arrayBufferRequestTransformer(data: ArrayBuffer) {
    return bufferRequestTransformer(Buffer.from(new Uint8Array(data)));
}

export function urlSearchParamsRequestTransformer(data: URLSearchParams) {
    return {
        buffer: Buffer.from(data.toString(), 'utf-8'),
        contentType: "application/x-www-form-urlencoded",
    };
}

export function formDataRequestTransformer(data: any) {
    throw new Error("Not implemented");
    return {
        buffer: data,
        contentType: "application/octet-stream",
    };
}

export function streamRequestTransformer(data: Stream) {
    return bufferRequestTransformer(data as any);
}

export const RequestProcessor = {

    _RegisteredTransformers: {} as KyofuucObject<RequestTransformer>,

    register(type: string, transformer: RequestTransformer) {
        RequestProcessor._RegisteredTransformers[type.toUpperCase()] = transformer;
    },

    unregister(type: string) {
        type = type?.toUpperCase();
        if (!(type in RequestProcessor._RegisteredTransformers)) return;
        delete RequestProcessor._RegisteredTransformers[type];
    },

    transform(type: string, data: any) {
        type = type?.toUpperCase();
        if (!(type in RequestProcessor._RegisteredTransformers)) {
            throw new UnregisteredRequestTypeError(type);
        }
        const transformer = RequestProcessor._RegisteredTransformers[type];
        if (!transformer) {
            throw new UnexpectedError(`The request type '${type}' found but with invalid transformer`);
        }
        return transformer(data);
    },

}

export function transformRequestData(config: Config, data: any, contentTypeNotSet: boolean, headers: KyofuucObject<any>, reject: (error: Error) => void) {
    try {
        const requestDataTransformed = RequestProcessor.transform(config.requestType!, data);
        if (contentTypeNotSet) {
            headers['Content-Type'] = requestDataTransformed.contentType;
        }
        return requestDataTransformed.buffer;
    } catch (err: any) {
        reject(Utils.kyofuucError(err.message, config as Config, ErrorCode.REQUEST_DATA_TRANSFORMATION_FAILED));
    }
}

let _defaultRequestTransformerRegistered = false;
if (!_defaultRequestTransformerRegistered) {
    _defaultRequestTransformerRegistered = true;
    RequestProcessor.register(RequestType.TEXT, textRequestTransformer);
    RequestProcessor.register(RequestType.JSON, jsonRequestTransformer);
    RequestProcessor.register(RequestType.STREAM, streamRequestTransformer);
    RequestProcessor.register(RequestType.BUFFER, bufferRequestTransformer);
    RequestProcessor.register(RequestType.FORM_DATA, formDataRequestTransformer);
    RequestProcessor.register(RequestType.ARRAY_BUFFER, arrayBufferRequestTransformer);
    RequestProcessor.register(RequestType.URL_SEARCH_PARAMS, urlSearchParamsRequestTransformer);
}
