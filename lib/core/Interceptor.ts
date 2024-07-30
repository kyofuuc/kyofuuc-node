
import { HttpConfig } from "../types";
import { KyofuucObject, Utils } from "../helper";

export enum HandlerType {
    CUSTOM = "CUSTOM",
    WS_OPEN = "WS_OPEN",
    WS_CLOSE = "WS_CLOSE",
    WS_ERROR = "WS_ERROR",
    WS_MESSAGE = "WS_MESSAGE",
    WS_STATE_CHANGE = "WS_STATE_CHANGE",
    HTTP_PRE_REQUEST = "HTTP_PRE_REQUEST",
    HTTP_POST_REQUEST = "HTTP_POST_REQUEST",
    HTTP_PRE_RESPONSE = "HTTP_PRE_RESPONSE",
    HTTP_POST_RESPONSE = "HTTP_POST_RESPONSE",
    HTTP_REQUEST_MAXIMUM_REDIRECTS_REACHED = "HTTP_REQUEST_MAXIMUM_REDIRECTS_REACHED",
}

export type HandlerCallback = (config?: HttpConfig, options?: KyofuucObject<any>, response?: any) => KyofuucObject<any> | void;

export interface Handler {
    type: HandlerType;
    cb: HandlerCallback;
    options?: KyofuucObject<any>;
    when?: (config?: HttpConfig) => boolean;
}

export class Interceptor {

    _count: number;
    _handlers: KyofuucObject<KyofuucObject<Handler>>;
    _reverse_handler_type_map: KyofuucObject<string>;

    constructor(interceptors?: Interceptor[]) {
        this._count = 0;
        this._handlers = {};
        this._reverse_handler_type_map = {};
        if (interceptors?.length) {
            this.registers(interceptors);
        }
    }

    count(): number {
        return this._count;
    }

    register(handler: Handler): string {
        const type = `${handler.type}`;
        const key = `${handler.type}_${Utils.randomString()}`;
        if (!(type in this._handlers)) {
            this._handlers[type] = {};
        }
        this._reverse_handler_type_map[key] = type;
        this._handlers[type][key] = handler;
        this._count++;
        return key;
    }

    unregister(key: string) {
        if (!(key in this._reverse_handler_type_map)) return;
        const type = this._reverse_handler_type_map[key];
        delete this._reverse_handler_type_map[key];
        delete this._handlers[type][key];
        this._count--;
    }

    purge() {
        this._count = 0;
        this._handlers = {};
        this._reverse_handler_type_map = {};
    }

    registers(interceptors: Interceptor[]): string[] {
        const keys: string[] = [];
        Utils.forEach(interceptors, (_: string, interceptor: Interceptor) => {
            Utils.forEach(interceptor._handlers, (_: string, value: Handler) => {
                keys.push(this.register(value));
            })
        });
        return keys;
    }

    handler(key: string): Handler | undefined {
        if (!(key in this._reverse_handler_type_map)) return;
        const type = this._reverse_handler_type_map[key];
        return this._handlers[type][key];
    }

    handlers(type: HandlerType) {
        return Object.values(this._handlers[`${type}`] ?? {});
    }

    invoke(type: HandlerType, config?: HttpConfig, response?: any): KyofuucObject<any>[] {
        const results: KyofuucObject<any>[] = [];
        const handlers = Object.values(this._handlers[`${type}`] ?? {});

        for (const handler of handlers) {
            if (handler.when && !handler.when(config)) continue;
            const result = handler.cb(config, handler.options, response);
            if (result === null || result === undefined) continue;
            results.push(result);
        }

        return results;
    }

    registerPreRequest(cb: HandlerCallback, options?: KyofuucObject<any>): string {
        return this.register({ cb, options, type: HandlerType.HTTP_PRE_REQUEST, });
    }

    registerPostRequest(cb: HandlerCallback, options?: KyofuucObject<any>): string {
        return this.register({ cb, options, type: HandlerType.HTTP_POST_REQUEST, });
    }

    registerPreResponse(cb: HandlerCallback, options?: KyofuucObject<any>): string {
        return this.register({ cb, options, type: HandlerType.HTTP_PRE_RESPONSE, });
    }

    registerPostResponse(cb: HandlerCallback, options?: KyofuucObject<any>): string {
        return this.register({ cb, options, type: HandlerType.HTTP_POST_RESPONSE, });
    }

    registerOnWsOpen(cb: HandlerCallback, options?: KyofuucObject<any>): string {
        return this.register({ cb, options, type: HandlerType.WS_OPEN, });
    }

    registerOnWsClose(cb: HandlerCallback, options?: KyofuucObject<any>): string {
        return this.register({ cb, options, type: HandlerType.WS_CLOSE, });
    }

    registerOnWsError(cb: HandlerCallback, options?: KyofuucObject<any>): string {
        return this.register({ cb, options, type: HandlerType.WS_ERROR, });
    }

    registerOnWsMessage(cb: HandlerCallback, options?: KyofuucObject<any>): string {
        return this.register({ cb, options, type: HandlerType.WS_MESSAGE, });
    }

    registerOnWsStateChange(cb: HandlerCallback, options?: KyofuucObject<any>): string {
        return this.register({ cb, options, type: HandlerType.WS_STATE_CHANGE, });
    }

}
