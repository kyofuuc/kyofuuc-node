
import { Http } from "./Http";
import { CacheManager } from "../cachemanager";
import { KyofuucObject, Utils } from "../helper";
import { NoEventFoundWithIdError } from "../exception";

export const EventQueueType = {

    HTTP_REQUEST: "HTTP_REQUEST",

}

export type Subscription = (...data: any) => void;
export type EventQueueExecutor = (...params: any) => any;
export type EventQueuePreExecutor = (cache: CacheManager<any>, ...params: any) => any[];

export interface Event {

    type: string;
    params: any[];
    subscriptionKey?: string;

}

export interface IEventQueue {

    clearSubscriptions(key?: string): void;
    subscriptions(key?: string): Subscription[];
    subscribe(key: string, subscription: Subscription): void;
    queueEvent(cache: CacheManager<any>, event: Event): string;
    unSubscribe(key: string, subscription: Subscription): void;
    execute(cache: CacheManager<any>, type: string): Promise<any[]>;
    executeOnly(cache: CacheManager<any>, id: string): Promise<any>;
    queue(cache: CacheManager<any>, type: string, ...params: any[]): string;

}

export class EventQueue implements IEventQueue {

    protected static instance: EventQueue;
    private _Subscriptions: KyofuucObject<Subscription[]>;
    private static _RegisteredExecutors: KyofuucObject<EventQueueExecutor> = {};
    private static _RegisteredPreExecutors: KyofuucObject<EventQueuePreExecutor> = {};

    constructor() {
        this._Subscriptions = {};
    }

    static getInstance() {
        if (!EventQueue.instance) EventQueue.instance = new EventQueue();
        return EventQueue.instance;
    }

    static executorIsRegistered(type: string) {
        return (type in EventQueue._RegisteredExecutors);
    }

    static registerExecutor(type: string, executor: EventQueueExecutor) {
        EventQueue._RegisteredExecutors[type] = executor;
    }
    
    static unregisterExecutor(type: string) {
        if (!(type in EventQueue._RegisteredExecutors)) return;
        delete EventQueue._RegisteredExecutors[type];
    }

    static registerPreExecutor(type: string, preExecutor: EventQueuePreExecutor) {
        EventQueue._RegisteredPreExecutors[type] = preExecutor;
    }
    
    static unregisterPreExecutor(type: string) {
        if (!(type in EventQueue._RegisteredPreExecutors)) return;
        delete EventQueue._RegisteredPreExecutors[type];
    }

    queueEvent(cache: CacheManager<any>, event: Event, key?: string): string {
        const id = this._generateId(key);
        cache.set(this._buildId(id), event);
        return id;
    }

    queue(cache: CacheManager<any>, type: string, ...params: any[]): string {
        return this.queueEvent(cache, { type, params });
    }

    async executeOnly(cache: CacheManager<any>, id: string) {
        const event = cache.getValue(this._buildId(id)) as Event;
        if (event === undefined) {
            throw new NoEventFoundWithIdError(id);
        }
        cache.remove(this._buildId(id));
        const params = (event.type in EventQueue._RegisteredPreExecutors ? EventQueue._RegisteredPreExecutors[event.type](cache, ...event.params) : event.params);
        const result = await (EventQueue._RegisteredExecutors[event.type](...params));
        if (event.subscriptionKey) this.report(event.subscriptionKey, result);
        return result;
    }

    async execute(cache: CacheManager<any>, type: string) {
        const results: any[] = [];
        const keys = cache.find((key) => key.startsWith(`KQ__`));
        for (const key of keys) {
            results.push(await this.executeOnly(cache, key.replace(`KQ__`, "")));
        }
        return results;
    }

    subscribe(key: string, subscription: Subscription) {
        if (!(key in this._Subscriptions)) this._Subscriptions[key] = [] as Subscription[];
        if (this._Subscriptions[key].includes(subscription)) return;
        this._Subscriptions[key].push(subscription);
    }

    unSubscribe(key: string, subscription: Subscription) {
        if (!(key in this._Subscriptions)) return;
        const index = this._Subscriptions[key].indexOf(subscription);
        if (index > -1) this._Subscriptions[key].splice(index, 1);
    }

    report(key: string, ...data: any) {
        if (!(key in this._Subscriptions)) return;
        this._Subscriptions[key].forEach(subscription => subscription(...data));
    }

    subscriptions(key?: string) {
        if (key) return this._Subscriptions[key];
        return Object.values(this._Subscriptions) as any as Subscription[];
    }
    
    clearSubscriptions(key?: string) {
        if (key) {
            if (key in this._Subscriptions) {
                delete this._Subscriptions[key]
            }
            return;
        }
        this._Subscriptions = {};
    }

    private _generateId(key?: string) {
        return (key ?? Utils.randomString(20, "0123456789"));
    }

    private _buildId(id: string) {
        return `KQ__${id}`;
    }

}

