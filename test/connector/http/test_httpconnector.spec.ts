
import assert from "assert";
import app from "../../resc/server";
import { Mocks } from "../../resc/Mocks";
import { Interceptor } from "../../../lib/core";
import { HttpConfig, Response } from "../../../lib/types";
import { Base64Encryptor } from "../../resc/Base64Encryptor";
import { Defaults, KyofuucObject, Utils } from "../../../lib/helper";
import httpConnector from "../../../lib/connector/http/httpConnector";
import { CookieCacheManager, LocalStorageCacheManager, MapCacheManager, SessionStorageCacheManager } from "../../../lib/cachemanager";

let localStorageImpl: any;
let sessionStorageImpl: any;
if (typeof localStorage === "undefined") {
    localStorageImpl = {} as any;
    sessionStorageImpl = {} as any;
    localStorageImpl.getItem = (key: string) => localStorageImpl[key];
    sessionStorageImpl.getItem = (key: string) => sessionStorageImpl[key];
    localStorageImpl.removeItem = (key: string) => delete localStorageImpl[key];
    sessionStorageImpl.removeItem = (key: string) => delete sessionStorageImpl[key];
    localStorageImpl.setItem = (key: string, value: any) => localStorageImpl[key] = value;
    sessionStorageImpl.setItem = (key: string, value: any) => sessionStorageImpl[key] = value;
} else {
    localStorageImpl = localStorage;
    sessionStorageImpl = sessionStorage;
}

let server: any;
let port = 3001;

before(done => {
    const startServer = (count: number, done: any) => {
        if (count >= 5) return;
        server = app.listen(port, done).on('error', (e: any) => {
            port++;
            startServer(++count, done);
        });
    }
    startServer(0, done);
});

after(done => {
    if (server) {
        server.close(done);
    }
});

it('validate httpConnector server greet', async () => {
    const response = await httpConnector(Defaults.httpConfig({
        method: "GET",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/greet`),
    }));

    assert.equal(response.status, 200);
    assert.equal(response.data, "Hello World!");
});

it('validate httpConnector test delete request', async () => {
    const response = await httpConnector(Defaults.httpConfig({
        method: "DELETE",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/delete`),
    }));

    assert.equal(response.status, 204);
});

it('validate httpConnector test get request', async () => {
    const response = await httpConnector(Defaults.httpConfig({
        method: "GET",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/get`),
    }));

    assert.equal(response.status, 204);
});

it('validate httpConnector test head request', async () => {
    const response = await httpConnector(Defaults.httpConfig({
        method: "HEAD",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/head`),
    }));

    assert.equal(response.status, 204);
});

it('validate httpConnector test options request', async () => {
    const response = await httpConnector(Defaults.httpConfig({
        method: "OPTIONS",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/options`),
    }));

    assert.equal(response.status, 204);
});

it('validate httpConnector test get request headers', async () => {
    const response = await httpConnector(Defaults.httpConfig({
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/headers`),
        method: "GET",
        timeout: 5000
    }));

    assert.equal(response.headers?.host, "127.0.0.1");
    assert.equal(response.headers!['cache-control'], "max-age=0");
    assert.equal(response.headers?.url, "/headers");
    assert.equal(response.status, 200);
});

it('validate httpConnector test redirect', async () => {
    const response1 = await httpConnector(Defaults.httpConfig({
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/redirect/301/301`),
        method: "GET",
        query: {
            key: "value"
        },
        timeout: 5000,
        maxRedirects: 0,
        validateStatus: (_) => true,
    }));
    const response2 = await httpConnector(Defaults.httpConfig({
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/redirect/302/302`),
        method: "GET",
        query: {
            key: "value"
        },
        timeout: 5000,
        maxRedirects: 1,
        validateStatus: (_) => true,
    }));
    const response3 = await httpConnector(Defaults.httpConfig({
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/redirect/200/200`),
        method: "GET",
        query: {
            key: "value"
        },
        timeout: 5000,
        maxRedirects: 2,
        validateStatus: (_) => true,
    }));

    assert.equal(response1.status, 301);
    assert.equal(response2.status, 302);
    assert.equal(response3.status, 200);
});

it('validate httpConnector redirectsData of redirect', async () => {
    const response = await httpConnector(Defaults.httpConfig({
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/redirect/301/302`),
        method: "GET",
        query: {
            key: "value"
        },
        timeout: 5000,
        maxRedirects: 2,
        storeRedirectsResponses: true
    }));

    assert.equal(response.redirectsResponses![0].status, 301);
    assert.equal(response.redirectsResponses![1].status, 302);
    assert.equal(response.redirectsResponses!.length, 2);
    assert.equal(response.status, 200);
});

it('validate httpConnector test post request', async () => {
    const response = await httpConnector(Defaults.httpConfig({
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/post`),
        method: "POST",
        headers: {
            "User-Agent": "kyofuuc/0.01",
            'Content-Type': 'application/json'
        },
        data: {
            email: "test@mail.com",
            password: "pass"
        },
        responseType: "json"
    }));

    assert.equal(response.status, 200);
    assert.equal(response.data.email, "test@mail.com");
    assert.equal(response.data.password, "pass");
});

it('validate httpConnector test patch request', async () => {
    const response = await httpConnector(Defaults.httpConfig({
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/patch`),
        method: "PATCH",
        headers: {
            "User-Agent": "kyofuuc/0.01",
            'Content-Type': 'application/json'
        },
        data: {
            email: "test@mail.com",
            password: "pass"
        },
        responseType: "json"
    }));

    assert.equal(response.status, 200);
    assert.equal(response.data.email, "test@mail.com");
    assert.equal(response.data.password, "pass");
});

it('validate httpConnector test put request', async () => {
    const response = await httpConnector(Defaults.httpConfig({
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/put`),
        method: "PUT",
        headers: {
            "User-Agent": "kyofuuc/0.01",
            'Content-Type': 'application/json'
        },
        data: {
            email: "test@mail.com",
            password: "pass"
        },
        responseType: "json"
    }));

    assert.equal(response.status, 200);
    assert.equal(response.data.email, "test@mail.com");
    assert.equal(response.data.password, "pass");
});

it('validate httpConnector test request basic auth', async () => {
    const response1 = await httpConnector(Defaults.httpConfig({
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/profile`),
        method: "GET",
        responseType: "json",
        validateStatus: (_) => true,
    }));
    const response2 = await httpConnector(Defaults.httpConfig({
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/profile`),
        method: "GET",
        auth: {
            username: "test.wrong@mail.com",
            password: "password"
        },
        responseType: "json",
        validateStatus: (_) => true,
    }));
    const response3 = await httpConnector(Defaults.httpConfig({
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/profile`),
        method: "GET",
        auth: {
            username: "test@mail.com",
            password: "password"
        },
        responseType: "json",
        validateStatus: (_) => true,
    }));

    assert.equal(response1.status, 400);
    assert.equal(response2.status, 401);
    assert.equal(response3.status, 200);
    assert.equal(response1.data.message, "Missing Authorization Header");
    assert.equal(response2.data.message, "Invalid Authentication Credentials");
    assert.equal(response3.data.message, "Success");
});

function _registerCacheInterceptors(config: HttpConfig) {
    if (!config.cache) return;
    if (!config.refreshCache) {
        config.interceptor?.registerPreRequest((config?: HttpConfig) => {
            const cached = config?.cacheManager?.get(config);
            if (!cached || (config?.cacheLifetime && cached?.date && (cached.date.getTime() - (new Date()).getTime()) >= config?.cacheLifetime)) {
                if (cached && !config?.persistCache) config?.cacheManager?.remove(config);
                return;
            }
            return {
                ...cached?.value,
                __cached__: true,
                __cached_expires_at__: cached?.date,
            };
        });
    }
    config.interceptor?.registerPostResponse((config?: HttpConfig, _?: KyofuucObject<any>, response?: Response) => {
        if (response?.__cached__ || response?.status === 150) return;
        config?.cacheManager?.set(config, response);
    });
}

it('validate httpConnector test with MapCacheManager cache', async () => {
    const interceptor = new Interceptor();
    const cacheManager = MapCacheManager.getInstance();  cacheManager.clear();
    const config1 = Defaults.httpConfig({
        cache: true,
        cacheManager,
        interceptor,
        key: "GREET_GET",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/greet`),
        method: "GET",
        validateStatus: (_) => true,
    });
    const config2 = Defaults.httpConfig({
        cache: true,
        cacheManager,
        interceptor,
        key: "GREET_POST",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/greet`),
        method: "POST",
        refreshCache: true,
        validateStatus: (_) => true,
    });
    _registerCacheInterceptors(config1);
    _registerCacheInterceptors(config2);
    const response1 = await httpConnector(config1);
    const response2 = await httpConnector(config1);
    const response3 = await httpConnector(config2);

    assert.equal(response1.status, 200);
    assert.equal(response1.__cached__, false);
    assert.equal(response1.data, "Hello World!");
    assert.equal(response2.status, 200);
    assert.equal(response2.__cached__, true);
    assert.equal(response2.data, "Hello World!");
    assert.equal(response3.__cached__, false);
    assert.notEqual(response3.status, 200);
    assert.notEqual(response3.data, "Hello World!");
    assert.equal(response3.status, 404);
});

const documentImpl = Mocks.mockDocumentCookie();
it('validate httpConnector test with CookieCacheManager cache', async () => {
    const interceptor = new Interceptor();
    Defaults.MaxCookieLength = 9000000000;
    const cacheManager = new CookieCacheManager({
        bucket: documentImpl,
        encryptor: Base64Encryptor,
    });
    const config1 = Defaults.httpConfig({
        cache: true,
        cacheManager,
        interceptor,
        key: "GREET_GET",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/greet`),
        method: "GET",
        validateStatus: (_) => true,
    });
    const config2 = Defaults.httpConfig({
        cache: true,
        cacheManager,
        interceptor,
        key: "GREET_POST",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/greet`),
        method: "POST",
        refreshCache: true,
        validateStatus: (_) => true,
    });
    _registerCacheInterceptors(config1);
    _registerCacheInterceptors(config2);
    const response1 = await httpConnector(config1);
    const response2 = await httpConnector(config1);
    const response3 = await httpConnector(config2);

    assert.equal(response1.status, 200);
    assert.equal(response1.__cached__, false);
    assert.equal(response1.data, "Hello World!");
    assert.equal(response2.status, 200);
    assert.equal(response2.__cached__, true);
    assert.equal(response2.data, "Hello World!");
    assert.equal(response3.__cached__, false);
    assert.notEqual(response3.status, 200);
    assert.notEqual(response3.data, "Hello World!");
    assert.equal(response3.status, 404);
});

it('validate httpConnector test with LocalStorageCacheManager cache', async () => {
    const interceptor = new Interceptor();
    const cacheManager = new LocalStorageCacheManager({
        bucket: localStorageImpl,
        encryptor: Base64Encryptor,
    });
    const config1 = Defaults.httpConfig({
        cache: true,
        cacheManager,
        interceptor,
        key: "GREET_GET",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/greet`),
        method: "GET",
        validateStatus: (_) => true,
    });
    const config2 = Defaults.httpConfig({
        cache: true,
        cacheManager,
        interceptor,
        key: "GREET_POST",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/greet`),
        method: "POST",
        refreshCache: true,
        validateStatus: (_) => true,
    });
    _registerCacheInterceptors(config1);
    _registerCacheInterceptors(config2);
    const response1 = await httpConnector(config1);
    const response2 = await httpConnector(config1);
    const response3 = await httpConnector(config2);

    assert.equal(response1.status, 200);
    assert.equal(response1.__cached__, false);
    assert.equal(response1.data, "Hello World!");
    assert.equal(response2.status, 200);
    assert.equal(response2.__cached__, true);
    assert.equal(response2.data, "Hello World!");
    assert.equal(response3.__cached__, false);
    assert.notEqual(response3.status, 200);
    assert.notEqual(response3.data, "Hello World!");
    assert.equal(response3.status, 404);
});

it('validate httpConnector test with SessionStorageCacheManager cache', async () => {
    const interceptor = new Interceptor();
    const cacheManager = new SessionStorageCacheManager({
        bucket: sessionStorageImpl,
        encryptor: Base64Encryptor,
    });
    const config1 = Defaults.httpConfig({
        cache: true,
        cacheManager,
        interceptor,
        key: "GREET_GET",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/greet`),
        method: "GET",
        validateStatus: (_) => true,
    });
    const config2 = Defaults.httpConfig({
        cache: true,
        cacheManager,
        interceptor,
        key: "GREET_POST",
        parsed: Utils.parseUrl(`http://127.0.0.1:${port}/greet`),
        method: "POST",
        refreshCache: true,
        validateStatus: (_) => true,
    });
    _registerCacheInterceptors(config1);
    _registerCacheInterceptors(config2);
    const response1 = await httpConnector(config1);
    const response2 = await httpConnector(config1);
    const response3 = await httpConnector(config2);

    assert.equal(response1.status, 200);
    assert.equal(response1.__cached__, false);
    assert.equal(response1.data, "Hello World!");
    assert.equal(response2.status, 200);
    assert.equal(response2.__cached__, true);
    assert.equal(response2.data, "Hello World!");
    assert.equal(response3.__cached__, false);
    assert.notEqual(response3.status, 200);
    assert.notEqual(response3.data, "Hello World!");
    assert.equal(response3.status, 404);
});


