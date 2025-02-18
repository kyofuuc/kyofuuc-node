

import { HandlerType, Interceptor } from "./Interceptor";
import { Defaults, KyofuucObject, Utils } from "../helper";
import { ConnectionClosedError, InvalidParameterError } from "../exception";
import { Config, RequestType, WsConfig, WsConnection, WsConnector, transformRequestData, transformResponseData, Response } from "../types";

export enum WsState {

    IDLE = "IDLE",
    READY = "READY",
    CONNECTED = "READY",
    CONNECTING = "CONNECTING",
    DISCONNECTED = "DISCONNECTED",
    RECONNECTING = "RECONNECTING",
    DISCONNECTING = "DISCONNECTING",
    PROCESSING_OUTGOING_MESSAGE = "PROCESSING_OUTGOING_MESSAGE",
    PROCESSING_INCOMING_MESSAGE = "PROCESSING_INCOMING_MESSAGE",

}

export interface IWs {

    close(): void;
    getState(): WsState;
    getConfig(): WsConfig;
    getBufferedAmount(): number;
    getUrl(config?: Config): string;
    sendMessage(message: any): void;
    getLastReconnectionCount(): number;
    getBinaryType(): string | undefined;
    setBinaryType(binaryType: string): void;
    reconnect(connector?: WsConnector): IWs;
    getConnection(): WsConnection | undefined;
    updateConfig(newConfig: WsConfig, merge?: boolean): void;
    connect(urlOrConfig: string | WsConfig, config?: WsConfig): IWs;

    onOpen(cb: (ws: IWs, event: any, options?: KyofuucObject<any>) => void, options?: KyofuucObject<any>): void;
    onError(cb: (ws: IWs, error: Error, options?: KyofuucObject<any>) => void, options?: KyofuucObject<any>): void;
    onStateChange(cb: (ws: IWs, state: WsState, options?: KyofuucObject<any>) => void, options?: KyofuucObject<any>): void;
    onMessage(cb: (ws: IWs, event: any, message: any, options?: KyofuucObject<any>) => void, options?: KyofuucObject<any>): void;
    onClose(cb: (ws: IWs, event: any, options?: KyofuucObject<any>) => void, options?: KyofuucObject<any>, always?: boolean): void;

}

export class Ws implements IWs {

    private _state: WsState;
    private _config?: WsConfig;
    private _baseConfig: WsConfig;
    protected static instance: Ws;
    private _connectorName?: string;
    private _connection?: WsConnection;
    private _reconnectionCount: number;
    private _nextReconnectionDelay: number;
    private _lastReconnectionCount: number;
    private _cachedInterceptor?: Interceptor;
    private _messageInterceptor?: Interceptor;

    constructor(baseConfig?: WsConfig) {
        this._state = WsState.IDLE;
        this._reconnectionCount = 0;
        this._lastReconnectionCount = 0;
        this._nextReconnectionDelay = 0;
        this._baseConfig = baseConfig ?? {};

        this._registerInterceptors = this._registerInterceptors.bind(this);
    }

    static getInstance(baseConfig?: WsConfig) {
        if (!Ws.instance) Ws.instance = new Ws(baseConfig);
        return Ws.instance;
    }

    static ws(config: WsConfig) {
        return (new Ws()).connect(config);
    }

    getConfig() {
        return this._baseConfig;
    }

    updateConfig(newConfig: WsConfig, merge?: boolean) {
        this._baseConfig = merge ? { ...this._baseConfig, ...newConfig } : newConfig;
    }

    getUrl(config?: Config): string {
        if (!config) {
            config = this._config;
        }
        if (!config?.url) {
            throw new InvalidParameterError("Invalid or missing url in config");
        }
        const mergedConfig = Utils.mergeObjects(this._baseConfig, config, ["url", "baseUrl", "query", "querySerializer"]) as WsConfig;
        return Utils.buildUrlWithQueryFromConfig({
            query: mergedConfig.query,
            url: Utils.buildFullUrl(mergedConfig),
            querySerializer: mergedConfig.querySerializer,
        }) ?? config.url;
    }

    connect(urlOrConfig?: string | WsConfig, config?: WsConfig | undefined): IWs {
        const interceptors: Interceptor[] = [];
        if (typeof urlOrConfig === 'string') {
            config = { ...(config ?? {}), url: urlOrConfig };
        } else {
            config = { ...(config ?? {}), ...(urlOrConfig ?? {}) };
        }
        if (this._cachedInterceptor) {
            interceptors.push(this._cachedInterceptor);
        } else {
            this._state = WsState.CONNECTING;
            if (config?.interceptor) interceptors.push(config.interceptor);
            if (this._baseConfig.interceptor) interceptors.push(this._baseConfig.interceptor);
        }
        this._config = Defaults.wsConfig(Utils.mergeObjects(this._baseConfig, config ?? {}));
        this._config.url = this.getUrl(this._config);
        this._config.interceptor = new Interceptor(interceptors);
        if (this._cachedInterceptor) {
            this._cachedInterceptor.purge();
            this._cachedInterceptor = undefined;
        } else {
            this._registerInterceptors();
        }
        if (this._state === WsState.CONNECTING) this._config?.interceptor.invoke(HandlerType.WS_STATE_CHANGE, this._config, this._state);
        this._connection = this._config.connector!(this._config);
        this._connectorName = this._connection!.name;
        return this;
    }

    reconnect(connector?: WsConnector | undefined): IWs {
        if (this._isConnected()) {
            if (this._config) {
                this._cachedInterceptor = new Interceptor([this._config.interceptor!]);
            }
            this.close();
        }
        this._state = WsState.RECONNECTING;
        this._cachedInterceptor?.invoke(HandlerType.WS_STATE_CHANGE, this._config, this._state);
        if (connector) this._config!.connector = connector;
        return this.connect(this._config);
    }

    sendMessage(message: any) {
        if (!this._isConnected()) {
            throw new ConnectionClosedError();
        }
        let dataTransformationFailed = false;
        this._state = WsState.PROCESSING_OUTGOING_MESSAGE;
        let data = transformRequestData(this._config!, message, false, {}, (error: Error) => {
            this._config?.interceptor?.invoke(HandlerType.WS_ERROR, this._config, error);
            this._state = WsState.READY;
            dataTransformationFailed = true;
        }) as Buffer | string | undefined;
        if (dataTransformationFailed) return;
        this._connection?.send(data);
        this._state = WsState.READY;
    }

    close(): void {
        if (!this._isConnected()) return;
        this._state = WsState.DISCONNECTING;
        this._cachedInterceptor?.invoke(HandlerType.WS_STATE_CHANGE, this._config, this._state);
        if (this._config) {
            this._config?.interceptor?.purge();
            this._config.interceptor = undefined;
        }
        if (this._messageInterceptor) {
            this._messageInterceptor?.purge();
            this._messageInterceptor = undefined;
        }
        this._connection?.close();
        this._connection = undefined;
    }

    getConnection(): WsConnection | undefined {
        return this._connection;
    }

    getBinaryType(): string | undefined {
        if (!this._isConnected()) return;
        if (this._connectorName === "wsConnector") {
            return this._connection!.binaryType;
        }
    }

    getBufferedAmount(): number {
        if (!this._isConnected()) return -1;
        if (this._connectorName === "wsConnector") {
            return this._connection!.bufferedAmount ?? -1;
        }
        return -1;
    }

    getState(): WsState {
        return this._state;
    }

    getLastReconnectionCount(): number {
        return this._lastReconnectionCount;
    }

    setBinaryType(binaryType: string): void {
        if (!this._isConnected()) return;
        if (this._connectorName === "wsConnector") {
            this._connection!.binaryType = binaryType;
        }
    }


    onOpen(cb: (ws: IWs, event: any, options?: KyofuucObject<any>) => void, options?: KyofuucObject<any>): void {
        if (!this._isConnected()) throw new ConnectionClosedError();
        this._config?.interceptor?.registerOnWsOpen((async (_?: Config, options?: KyofuucObject<any>, event?: any) => cb(this, event, options)).bind(this), options);
    }

    onClose(cb: (ws: IWs, event: any, options?: KyofuucObject<any>) => void, options?: KyofuucObject<any>, always?: boolean): void {
        if (!this._isConnected()) throw new ConnectionClosedError();
        this._config?.interceptor?.registerOnWsClose((async (_?: Config, options?: KyofuucObject<any>, event?: any) => {
            if (!always && this._state !== WsState.DISCONNECTED) return;
            cb(this, event, options);
        }).bind(this), options);
    }

    onError(cb: (ws: IWs, error: Error, options?: KyofuucObject<any>) => void, options?: KyofuucObject<any>): void {
        if (!this._isConnected()) throw new ConnectionClosedError();
        this._config?.interceptor?.registerOnWsError((async (_?: Config, options?: KyofuucObject<any>, event?: any) => cb(this, event, options)).bind(this), options);
    }

    onStateChange(cb: (ws: IWs, state: WsState, options?: KyofuucObject<any>) => void, options?: KyofuucObject<any>): void {
        if (!this._isConnected()) throw new ConnectionClosedError();
        this._config?.interceptor?.registerOnWsStateChange((async (_?: Config, options?: KyofuucObject<any>, event?: any) => cb(this, event, options)).bind(this), options);
    }

    onMessage(cb: (ws: IWs, event: any, message: any, options?: KyofuucObject<any>) => void, options?: KyofuucObject<any>): void {
        if (!this._isConnected()) throw new ConnectionClosedError();
        if (!this._messageInterceptor) {
            this._messageInterceptor = new Interceptor();
        }
        this._messageInterceptor?.registerOnWsMessage((async (_?: Config, options?: KyofuucObject<any>, event?: any) => {
            cb(this, event.event, event.message, options);
        }).bind(this), options);
    }


    private _isConnected() {
        return !(this._state === WsState.IDLE || this._state === WsState.DISCONNECTING || this._state === WsState.DISCONNECTED);
    }

    private _registerInterceptors() {
        if (!this._config!.protocol || this._config!.protocol === "text") {
            this._config!.requestType = RequestType.TEXT;
            this._config!.responseType = RequestType.TEXT;
        } else if (this._config!.protocol === "json") {
            this._config!.requestType = RequestType.JSON;
            this._config!.responseType = RequestType.JSON;
        }

        this.onOpen(((_: IWs, __: any, ___?: KyofuucObject<any>) => {
            this._reconnectionCount = 0
            this._state = WsState.READY;
            this._nextReconnectionDelay = 0;
            this._config?.interceptor?.invoke(HandlerType.WS_STATE_CHANGE, this._config, this._state);
        }).bind(this));

        this.onClose(((_: IWs, __: any, ___?: KyofuucObject<any>) => {
            if (this._state !== WsState.DISCONNECTING && this._config?.reconnect) {
                if (this._lastReconnectionCount < (this._config?.maxReconnect ?? 0)) {
                    this._reconnectionCount++;
                    this._lastReconnectionCount++;
                    this._nextReconnectionDelay = (this._config?.reconnectIntervalByPower
                        ? Math.pow((this._config.reconnectInterval ?? 0), this._reconnectionCount)
                        : this._config.reconnectInterval) ?? 0
                    setTimeout(this.reconnect.bind(this), this._nextReconnectionDelay * 1000);
                    return;
                }
            }
            this._state = WsState.DISCONNECTED;
            this._config?.interceptor?.invoke(HandlerType.WS_STATE_CHANGE, this._config, this._state);
        }).bind(this), undefined, true);

        this._config?.interceptor?.registerOnWsMessage((async (_?: Config, __?: KyofuucObject<any>, message?: any) => {
            this._state = WsState.PROCESSING_OUTGOING_MESSAGE;
            this._config?.interceptor?.invoke(HandlerType.WS_STATE_CHANGE, this._config, this._state);
            transformResponseData(this._config!, this._config!, message.data, (result: Response) => {
                this._state = WsState.READY;
                this._config?.interceptor?.invoke(HandlerType.WS_STATE_CHANGE, this._config, this._state);
                this._messageInterceptor?.invoke(HandlerType.WS_MESSAGE, this._config, { event: message, message: result.data });
            }, (error: Error) => {
                this._state = WsState.READY;
                this._config?.interceptor?.invoke(HandlerType.WS_ERROR, this._config, error);
                this._config?.interceptor?.invoke(HandlerType.WS_STATE_CHANGE, this._config, this._state);
            });
        }).bind(this));
    }

}
