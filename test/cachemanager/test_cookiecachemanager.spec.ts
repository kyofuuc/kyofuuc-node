
import assert from "assert";
import { Mocks } from "../resc/Mocks";
import { Method } from "../../lib/types";
import { Defaults } from "../../lib/helper";
import { Base64Encryptor } from "../resc/Base64Encryptor";
import { CookieCacheManager } from "../../lib/cachemanager";
import { NoSufficientCacheSpaceLeftError } from "../../lib/exception";

it('validate CookieCacheManager options', () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager1 = new CookieCacheManager<number>({ bucket });
	const cacheManager2 = CookieCacheManager.getInstance({ bucket });
	const cacheManager3 = new CookieCacheManager<string>({ bucket: { cookie: "" } });

	assert.equal(0, cacheManager1.usedSpace());
	assert.equal(0, cacheManager2.usedSpace());
	assert.equal(0, cacheManager3.usedSpace());
	assert.equal(53, cacheManager1.calculateSpace("", 1));
	assert.equal(55, cacheManager2.calculateSpace("", "1"));
	assert.equal(57, cacheManager2.calculateSpace("", "one"));
	assert.equal(57, cacheManager3.calculateSpace("", "two"));
	assert.equal(Defaults.MaxCookieLength, cacheManager1.availableSpace());
	assert.equal(Defaults.MaxCookieLength, cacheManager2.availableSpace());
	assert.equal(Defaults.MaxCookieLength, cacheManager3.availableSpace());
});

it('validate CookieCacheManager set', () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager = new CookieCacheManager({ bucket });

	assert.equal(0, cacheManager.usedSpace());
	assert.equal(Defaults.MaxCookieLength, cacheManager.availableSpace());

	cacheManager.set("key1", "hello one");
	assert.equal(67, cacheManager.usedSpace());

	cacheManager.set("key2", "hello two");
	assert.equal(134, cacheManager.usedSpace());

	cacheManager.set("key1", "hello one again");
	assert.equal(140, cacheManager.usedSpace());

	cacheManager.set("key3", "hello three");
	assert.equal(209, cacheManager.usedSpace());

	cacheManager.set({ url: "/hello" }, "hello three");
	assert.equal(292, cacheManager.usedSpace());
});

it('validate CookieCacheManager no sufficient queue space left', () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager = new CookieCacheManager({ bucket });

	assert.doesNotThrow(() => cacheManager.set("key1", Array(100).fill("hello one")), NoSufficientCacheSpaceLeftError);
	assert.doesNotThrow(() => cacheManager.set("key2", Array(100).fill("hello two")), NoSufficientCacheSpaceLeftError);
	assert.throws(() => cacheManager.set("key3", Array(1000).fill("hello three")), NoSufficientCacheSpaceLeftError);
	assert.throws(() => cacheManager.set("key4", Array(1000).fill("hello three")), NoSufficientCacheSpaceLeftError);
	assert.throws(() => cacheManager.set("key5", Array(1000).fill("hello three")), NoSufficientCacheSpaceLeftError);
});

it('validate CookieCacheManager get', () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager = new CookieCacheManager({ bucket });

	cacheManager.set("key1", "hello one");
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(158, cacheManager.usedSpace());
	assert.equal("hello one", cacheManager.getValue("key1"));
	assert.equal("hello one", cacheManager.get("key1")?.value);
	assert.equal("object", typeof cacheManager.get({ url: "/hello", method: Method.POST })?.value);
	assert.equal(true, cacheManager.get({ url: "/hello", method: Method.POST })?.date instanceof Date);
	assert.deepEqual({ greeting: "holla" }, cacheManager.getValue({ url: "/hello", method: Method.POST }));
	assert.deepEqual({ greeting: "holla" }, cacheManager.get({ url: "/hello", method: Method.POST })?.value);
});

it('validate CookieCacheManager has and getValue', () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager = new CookieCacheManager({ bucket });

	cacheManager.set("key1", "hello one");
	cacheManager.set("key2", "hello two");
	cacheManager.set("key4", "hello four");
	cacheManager.set("key7", "hello seven");
	cacheManager.set({ url: "/hello" }, "hello url");
	cacheManager.set({ url: "/hello", method: Method.GET }, {});
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(515, cacheManager.usedSpace());
	assert.equal(true, cacheManager.has("key1"));
	assert.equal(true, cacheManager.has("key2"));
	assert.equal(true, cacheManager.has("key4"));
	assert.equal(true, cacheManager.has("key7"));
	assert.equal(false, cacheManager.has("key5"));
	assert.equal(false, cacheManager.has("key6"));
	assert.equal(false, cacheManager.has("key3"));
	assert.equal(false, cacheManager.has({ url: "/world" }));
	assert.equal(true, cacheManager.has({ url: "/hello" }));
	assert.equal(true, cacheManager.has({ url: "/hello", method: Method.GET }));
	assert.equal(true, cacheManager.has({ url: "/hello", method: Method.POST }));
	assert.equal(false, cacheManager.has({ url: "/hello", method: Method.PATCH }));

	assert.equal(undefined, cacheManager.getValue("key3"));
	assert.equal(undefined, cacheManager.getValue("key5"));
	assert.equal(undefined, cacheManager.getValue("key6"));
	assert.equal("hello one", cacheManager.getValue("key1"));
	assert.equal("hello two", cacheManager.getValue("key2"));
	assert.equal("hello four", cacheManager.getValue("key4"));
	assert.equal("hello seven", cacheManager.getValue("key7"));
	assert.equal(undefined, cacheManager.getValue({ url: "/world" }));
	assert.equal("hello url", cacheManager.getValue({ url: "/hello" }));
	assert.deepEqual({}, cacheManager.getValue({ url: "/hello", method: Method.GET }));
	assert.equal(undefined, cacheManager.getValue({ url: "/hello", method: Method.PATCH }));
	assert.deepEqual({ greeting: "holla" }, cacheManager.getValue({ url: "/hello", method: Method.POST }));
});

it('validate CookieCacheManager remove and clear', () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager = new CookieCacheManager({ bucket });

	cacheManager.set("key1", "hello one");
	cacheManager.set("key2", "hello two");
	cacheManager.set("key3", "hello three");
	cacheManager.set({ url: "/hello", method: Method.GET }, {});
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(366, cacheManager.usedSpace());
	cacheManager.remove("key2");
	cacheManager.remove({ url: "/hello/world", method: Method.GET });
	assert.equal(299, cacheManager.usedSpace());
	cacheManager.remove("key3");
	cacheManager.remove({ url: "/hello", method: Method.GET });
	assert.equal(299, cacheManager.usedSpace());

	cacheManager.clear();
	assert.equal(true, cacheManager.usedSpace() < 300);
});

it('validate CookieCacheManager encryption', () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager = new CookieCacheManager({ bucket, encryptor: Base64Encryptor });

	cacheManager.set("key1", "hello one");
	cacheManager.set({ url: "/hello" }, "hello url");
	cacheManager.set({ url: "/hello", method: Method.GET }, {});
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });

	assert.equal(395, cacheManager.usedSpace());
	assert.equal("hello one", cacheManager.getValue("key1"));
	assert.equal("hello url", cacheManager.getValue({ url: "/hello" }));
	assert.deepEqual({}, cacheManager.getValue({ url: "/hello", method: Method.GET }));
	assert.deepEqual({ greeting: "yahoo" }, cacheManager.getValue({ url: "/hello", method: Method.POST }));
	assert.notDeepEqual({ greeting: "holla" }, cacheManager.getValue({ url: "/hello", method: Method.POST }));
});

it('validate CookieCacheManager key encrypted with encryption', () => {
	const bucket = Mocks.mockDocumentCookie();
	const cacheManager1 = new CookieCacheManager({ bucket, encryptor: Base64Encryptor });
	const cacheManager2 = new CookieCacheManager({ bucket, encryptor: Base64Encryptor, encryptKey: true });

	cacheManager1.set("key1", "hello one");
	cacheManager2.set("key1", "hello one");
	cacheManager1.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });
	cacheManager2.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });

	assert.equal(203, cacheManager1.usedSpace());
	assert.equal(216, cacheManager2.usedSpace());
	assert.equal(true, cacheManager1.has("key1"));
	assert.equal(true, cacheManager2.has("key1"));
	assert.equal("hello one", cacheManager1.getValue("key1"));
	assert.equal("hello one", cacheManager2.getValue("key1"));
	assert.deepEqual({ greeting: "yahoo" }, cacheManager1.getValue({ url: "/hello", method: Method.POST }));
	assert.deepEqual({ greeting: "yahoo" }, cacheManager2.getValue({ url: "/hello", method: Method.POST }));
});
