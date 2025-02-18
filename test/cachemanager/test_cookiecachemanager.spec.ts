
import assert from "assert";
import { Mocks } from "../resc/Mocks";
import { Method } from "../../lib/types";
import { Defaults } from "../../lib/helper";
import { Base64Encryptor } from "../resc/Base64Encryptor";
import { CookieCacheManager } from "../../lib/cachemanager";
import { NoSufficientCacheSpaceLeftError } from "../../lib/exception";

it('validate CookieCacheManager options', async () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager1 = new CookieCacheManager<number>({ bucket });
	const cacheManager2 = CookieCacheManager.getInstance({ bucket });
	const cacheManager3 = new CookieCacheManager<string>({ bucket: { cookie: "" } });

	assert.equal(0, await cacheManager1.usedSpace());
	assert.equal(0, await cacheManager2.usedSpace());
	assert.equal(0, await cacheManager3.usedSpace());
	assert.equal(53, await cacheManager1.calculateSpace("", 1));
	assert.equal(55, await cacheManager2.calculateSpace("", "1"));
	assert.equal(57, await cacheManager2.calculateSpace("", "one"));
	assert.equal(57, await cacheManager3.calculateSpace("", "two"));
	assert.equal(Defaults.MaxCookieLength, await cacheManager1.availableSpace());
	assert.equal(Defaults.MaxCookieLength, await cacheManager2.availableSpace());
	assert.equal(Defaults.MaxCookieLength, await cacheManager3.availableSpace());
});

it('validate CookieCacheManager set', async () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager = new CookieCacheManager({ bucket });

	assert.equal(0, await cacheManager.usedSpace());
	assert.equal(Defaults.MaxCookieLength, await cacheManager.availableSpace());

	await cacheManager.set("key1", "hello one");
	assert.equal(67, await cacheManager.usedSpace());

	await cacheManager.set("key2", "hello two");
	assert.equal(134, await cacheManager.usedSpace());

	await cacheManager.set("key1", "hello one again");
	assert.equal(149, await cacheManager.usedSpace());

	await cacheManager.set("key3", "hello three");
	assert.equal(218, await cacheManager.usedSpace());

	await cacheManager.set({ url: "/hello" }, "hello three");
	assert.equal(301, await cacheManager.usedSpace());
});

it('validate CookieCacheManager no sufficient queue space left', async () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager = new CookieCacheManager({ bucket });

	assert.doesNotReject(() => cacheManager.set("key1", Array(100).fill("hello one")), NoSufficientCacheSpaceLeftError);
	assert.doesNotReject(() => cacheManager.set("key2", Array(100).fill("hello two")), NoSufficientCacheSpaceLeftError);
	assert.rejects(() => cacheManager.set("key3", Array(1000).fill("hello three")), NoSufficientCacheSpaceLeftError);
	assert.rejects(() => cacheManager.set("key4", Array(1000).fill("hello three")), NoSufficientCacheSpaceLeftError);
	assert.rejects(() => cacheManager.set("key5", Array(1000).fill("hello three")), NoSufficientCacheSpaceLeftError);
});

it('validate CookieCacheManager get', async () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager = new CookieCacheManager({ bucket });

	await cacheManager.set("key1", "hello one");
	await cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(158, await cacheManager.usedSpace());
	assert.equal("hello one", await cacheManager.getValue("key1"));
	assert.equal("hello one", (await cacheManager.get("key1"))?.value);
	assert.equal("object", typeof (await cacheManager.get({ url: "/hello", method: Method.POST }))?.value);
	assert.equal(true, (await cacheManager.get({ url: "/hello", method: Method.POST }))?.date instanceof Date);
	assert.deepEqual({ greeting: "holla" }, await cacheManager.getValue({ url: "/hello", method: Method.POST }));
	assert.deepEqual({ greeting: "holla" }, (await cacheManager.get({ url: "/hello", method: Method.POST }))?.value);
});

it('validate CookieCacheManager has and getValue', async () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager = new CookieCacheManager({ bucket });

	await cacheManager.set("key1", "hello one");
	await cacheManager.set("key2", "hello two");
	await cacheManager.set("key4", "hello four");
	await cacheManager.set("key7", "hello seven");
	await cacheManager.set({ url: "/hello" }, "hello url");
	await cacheManager.set({ url: "/hello", method: Method.GET }, {});
	await cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(515, await cacheManager.usedSpace());
	assert.equal(true, await cacheManager.has("key1"));
	assert.equal(true, await cacheManager.has("key2"));
	assert.equal(true, await cacheManager.has("key4"));
	assert.equal(true, await cacheManager.has("key7"));
	assert.equal(false, await cacheManager.has("key5"));
	assert.equal(false, await cacheManager.has("key6"));
	assert.equal(false, await cacheManager.has("key3"));
	assert.equal(false, await cacheManager.has({ url: "/world" }));
	assert.equal(true, await cacheManager.has({ url: "/hello" }));
	assert.equal(true, await cacheManager.has({ url: "/hello", method: Method.GET }));
	assert.equal(true, await cacheManager.has({ url: "/hello", method: Method.POST }));
	assert.equal(false, await cacheManager.has({ url: "/hello", method: Method.PATCH }));

	assert.equal(undefined, await cacheManager.getValue("key3"));
	assert.equal(undefined, await cacheManager.getValue("key5"));
	assert.equal(undefined, await cacheManager.getValue("key6"));
	assert.equal("hello one", await cacheManager.getValue("key1"));
	assert.equal("hello two", await cacheManager.getValue("key2"));
	assert.equal("hello four", await cacheManager.getValue("key4"));
	assert.equal("hello seven", await cacheManager.getValue("key7"));
	assert.equal(undefined, await cacheManager.getValue({ url: "/world" }));
	assert.equal("hello url", await cacheManager.getValue({ url: "/hello" }));
	assert.deepEqual({}, await cacheManager.getValue({ url: "/hello", method: Method.GET }));
	assert.equal(undefined, await cacheManager.getValue({ url: "/hello", method: Method.PATCH }));
	assert.deepEqual({ greeting: "holla" }, await cacheManager.getValue({ url: "/hello", method: Method.POST }));
});

it('validate CookieCacheManager remove and clear', async () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager = new CookieCacheManager({ bucket });

	await cacheManager.set("key1", "hello one");
	await cacheManager.set("key2", "hello two");
	await cacheManager.set("key3", "hello three");
	await cacheManager.set({ url: "/hello", method: Method.GET }, {});
	await cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(366, await cacheManager.usedSpace());
	await cacheManager.remove("key2");
	await cacheManager.remove({ url: "/hello/world", method: Method.GET });
	assert.equal(308, await cacheManager.usedSpace());
	await cacheManager.remove("key3");
	await cacheManager.remove({ url: "/hello", method: Method.GET });
	assert.equal(308, await cacheManager.usedSpace());

	await cacheManager.clear();
	assert.equal(true, (await cacheManager.usedSpace()) < 300);
});

it('validate CookieCacheManager encryption', async () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager = new CookieCacheManager({ bucket, encryptor: Base64Encryptor });

	await cacheManager.set("key1", "hello one");
	await cacheManager.set({ url: "/hello" }, "hello url");
	await cacheManager.set({ url: "/hello", method: Method.GET }, {});
	await cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });
	await cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });

	assert.equal(419, await cacheManager.usedSpace());
	assert.equal("hello one", await cacheManager.getValue("key1"));
	assert.equal("hello url", await cacheManager.getValue({ url: "/hello" }));
	assert.deepEqual({}, await cacheManager.getValue({ url: "/hello", method: Method.GET }));
	assert.deepEqual({ greeting: "yahoo" }, await cacheManager.getValue({ url: "/hello", method: Method.POST }));
	assert.notDeepEqual({ greeting: "holla" }, await cacheManager.getValue({ url: "/hello", method: Method.POST }));
});

it('validate CookieCacheManager key encrypted with encryption', async () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager1 = new CookieCacheManager({ bucket, encryptor: Base64Encryptor });
	const cacheManager2 = new CookieCacheManager({ bucket, encryptor: Base64Encryptor, encryptKey: true });

	await cacheManager1.set("key1", "hello one");
	await cacheManager2.set("key1", "hello one");
	await cacheManager1.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });
	await cacheManager2.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });

	assert.equal(203, await cacheManager1.usedSpace());
	assert.equal(216, await cacheManager2.usedSpace());
	assert.equal(true, await cacheManager1.has("key1"));
	assert.equal(true, await cacheManager2.has("key1"));
	assert.equal("hello one", await cacheManager1.getValue("key1"));
	assert.equal("hello one", await cacheManager2.getValue("key1"));
	assert.deepEqual({ greeting: "yahoo" }, await cacheManager1.getValue({ url: "/hello", method: Method.POST }));
	assert.deepEqual({ greeting: "yahoo" }, await cacheManager2.getValue({ url: "/hello", method: Method.POST }));
});
