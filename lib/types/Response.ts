
import { Stream } from "stream";
import { Config, HttpConfig } from "./Config";
import { ErrorCode, KyofuucObject, Utils } from "../helper";
import { UnexpectedError, UnregisteredResponseTypeError } from "../exception";

export const ResponseType = {

    TEXT: "TEXT",
    JSON: "JSON",
    STREAM: "STREAM",
    BUFFER: "BUFFER",
    NOCONTENT: "NOCONTENT",
    ARRAY_BUFFER: "ARRAY_BUFFER",

}

export type ResponseTransformer<T> = (data: Stream | any[] | string) => { data: T; contentType?: string; };

export interface Response {

    data?: any;
    key?: string;
    url?: string;
    body?: string;
    request?: any;
    status: number;
    statusText: string;
    config: HttpConfig;
    __cached__?: boolean;
    __cached_expires_at__?: Date;
    redirectsResponses?: Response[];
    headers?: KyofuucObject<number | string | string[]>;

}

export function textResponseTransformer(data: Stream | any[] | string) {
    return { data };
}

export function jsonResponseTransformer(data: Stream | any[] | string) {
    return { data: JSON.parse(data as string), };
}

export function streamResponseTransformer(data: Stream | any[] | string) {
    return { data };
}

export function bufferResponseTransformer(data: Stream | any[] | string) {
    return { data: Buffer.from(data as any[]), };
}

export function arrayBufferResponseTransformer(data: Stream | any[] | string) {
    return { data };
}

export function noContentResponseTransformer(_: Stream | any[] | string) {
    return { data: "" };
}

export const ResponseProcessor = {

    _RegisteredTransformers: {} as KyofuucObject<ResponseTransformer<any>>,

    register<T>(type: string, transformer: ResponseTransformer<T>) {
        ResponseProcessor._RegisteredTransformers[type.toUpperCase()] = transformer;
    },

    unregister(type: string) {
        type = type?.toUpperCase();
        if (!(type in ResponseProcessor._RegisteredTransformers)) return;
        delete ResponseProcessor._RegisteredTransformers[type];
    },

    transform(type: string, data: any) {
        type = type?.toUpperCase();
        if (!(type in ResponseProcessor._RegisteredTransformers)) {
            throw new UnregisteredResponseTypeError(type);
        }
        const transformer = ResponseProcessor._RegisteredTransformers[type];
        if (!transformer) {
            throw new UnexpectedError(`The response type '${type}' found but with invalid transformer`);
        }
        return transformer(data);
    },

}

export function transformResponseData(config: Config, response: Partial<Response>, res: any, onSuccess: (result: Response) => void, onError: (error: Error) => void) {
    try {
        const responseDataTransformed = ResponseProcessor.transform(config.responseType!, res);
        response.data = responseDataTransformed.data;
        if (responseDataTransformed.contentType && response.headers) {
            response.headers!['Content-Type'] = responseDataTransformed.contentType;
        }
    } catch (err: any) {
        onError(Utils.kyofuucError(err.message, config, ErrorCode.RESPONSE_DATA_TRANSFORMATION_FAILED));
        return;
    }
    onSuccess(response as Response);
}

let _defaultResponseTransformerRegistered = false;
if (!_defaultResponseTransformerRegistered) {
    _defaultResponseTransformerRegistered = true;
    ResponseProcessor.register(ResponseType.TEXT, textResponseTransformer);
    ResponseProcessor.register(ResponseType.JSON, jsonResponseTransformer);
    ResponseProcessor.register(ResponseType.BUFFER, bufferResponseTransformer);
    ResponseProcessor.register(ResponseType.STREAM, streamResponseTransformer);
    ResponseProcessor.register(ResponseType.NOCONTENT, noContentResponseTransformer);
    ResponseProcessor.register(ResponseType.ARRAY_BUFFER, arrayBufferResponseTransformer);
}
