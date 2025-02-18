
import assert from "assert";
import { Method } from "../../lib/types";
import { LzEncryptor } from "../resc/LzEncryptor";
import { Utils, Defaults } from "../../lib/helper";
import { NoSufficientCacheSpaceLeftError } from "../../lib/exception";
import { LocalStorageCacheManager, SessionStorageCacheManager } from "../../lib/cachemanager";

const bucket = Utils.presentElseImport(typeof localStorage,
	() => localStorage,
	() => {
		const localStorageImpl: any = {};
		localStorageImpl.getItem = function getItem(key: string) {
			return localStorageImpl[key];
		};
		localStorageImpl.setItem = function setItem(key: string, value: any) {
			localStorageImpl[key] = value;
		};
		localStorageImpl.removeItem = function removeItem(key: string) {
			delete localStorageImpl[key];
		};
		return localStorageImpl;
	});

it('validate StorageCacheManager options', async () => {
	const cacheManager1 = new LocalStorageCacheManager({ bucket });
	const cacheManager2 = new LocalStorageCacheManager<number>({ bucket });
	const cacheManager3 = new SessionStorageCacheManager<string>({ bucket });

	assert.equal(0, await cacheManager1.usedSpace());
	assert.equal(0, await cacheManager2.usedSpace());
	assert.equal(0, await cacheManager3.usedSpace());
	assert.equal(53, await cacheManager1.calculateSpace("", "1"));
	assert.equal(63, await cacheManager1.calculateSpace("", "hello world"));
	assert.equal(63, await cacheManager2.calculateSpace("", 1234567890197));
	assert.equal(63, await cacheManager3.calculateSpace("", "hello world"));
	assert.equal(Defaults.MaxStorageSpace, await cacheManager3.availableSpace());
	assert.equal(Defaults.MaxStorageSpace, await cacheManager1.availableSpace());
	assert.equal(Defaults.MaxStorageSpace, await cacheManager2.availableSpace());
});

it('validate StorageCacheManager set', async () => {
	const cacheManager = new LocalStorageCacheManager({ bucket });

	assert.equal(0, await cacheManager.usedSpace());
	assert.equal(Defaults.MaxStorageSpace, await cacheManager.availableSpace());

	await cacheManager.set("key1", "hello one");
	assert.equal(61, await cacheManager.usedSpace());

	await cacheManager.set("key2", "hello two");
	assert.equal(122, await cacheManager.usedSpace());

	await cacheManager.set("key1", "hello one again");
	assert.equal(128, await cacheManager.usedSpace());

	await cacheManager.set("key3", "hello three");
	assert.equal(191, await cacheManager.usedSpace());

	await cacheManager.set({ url: "/hello" }, "hello three");
	assert.equal(254, await cacheManager.usedSpace());
});

it('validate StorageCacheManager no sufficient queue space left', async () => {
	const cacheManager = new LocalStorageCacheManager({ bucket });

	await cacheManager.clear();
	assert.doesNotReject(() => cacheManager.set("key1", Array(111111).fill("hello one")), NoSufficientCacheSpaceLeftError);
	assert.doesNotReject(() => cacheManager.set("key2", Array(111111).fill("hello two")), NoSufficientCacheSpaceLeftError);
	assert.doesNotReject(() => cacheManager.set("key3", Array(111111).fill("hello three")), NoSufficientCacheSpaceLeftError);
	assert.rejects(() => cacheManager.set("key4", Array(99999).fill("hello three")), NoSufficientCacheSpaceLeftError);
	assert.rejects(() => cacheManager.set("key5", Array(99999).fill("hello three")), NoSufficientCacheSpaceLeftError);
	assert.rejects(() => cacheManager.set("key6", Array(99999).fill("hello three")), NoSufficientCacheSpaceLeftError);
});

it('validate StorageCacheManager get', async () => {
	const cacheManager = new LocalStorageCacheManager({ bucket });

	await cacheManager.clear();
	await cacheManager.set("key1", "hello one");
	await cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(131, await cacheManager.usedSpace());
	assert.equal("hello one", await cacheManager.getValue("key1"));
	assert.equal("hello one", (await cacheManager.get("key1"))?.value);
	assert.equal("object", typeof (await cacheManager.get({ url: "/hello", method: Method.POST }))?.value);
	assert.equal(true, (await cacheManager.get({ url: "/hello", method: Method.POST }))?.date instanceof Date);
	assert.deepEqual({ greeting: "holla" }, await cacheManager.getValue({ url: "/hello", method: Method.POST }));
	assert.deepEqual({ greeting: "holla" }, (await cacheManager.get({ url: "/hello", method: Method.POST }))?.value);
});

it('validate StorageCacheManager has and getValue', async () => {
	const cacheManager = new SessionStorageCacheManager({ bucket });

	await cacheManager.clear();
	await cacheManager.set("key1", "hello one");
	await cacheManager.set("key2", "hello two");
	await cacheManager.set("key4", "hello four");
	await cacheManager.set("key7", "hello seven");
	await cacheManager.set({ url: "/hello" }, "hello url");
	await cacheManager.set({ url: "/hello", method: Method.GET }, {});
	await cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(430, await cacheManager.usedSpace());
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

it('validate StorageCacheManager remove and clear', async () => {
	const cacheManager = new SessionStorageCacheManager({ bucket });
	
	await cacheManager.clear();
	await cacheManager.set("key1", "hello one");
	await cacheManager.set("key2", "hello two");
	await cacheManager.set("key3", "hello three");
	await cacheManager.set({ url: "/hello", method: Method.GET }, {});
	await cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(307, await cacheManager.usedSpace());
	await cacheManager.remove("key2");
	await cacheManager.remove({ url: "/hello/world", method: Method.GET });
	assert.equal(246, await cacheManager.usedSpace());
	await cacheManager.remove("key3");
	await cacheManager.remove({ url: "/hello", method: Method.GET });
	assert.equal(131, await cacheManager.usedSpace());

	await cacheManager.clear();
	assert.equal(0, await cacheManager.usedSpace());
});

it('validate StorageCacheManager encryption', async () => {
	const cacheManager = new SessionStorageCacheManager({ bucket, encryptor: LzEncryptor });

	await cacheManager.clear();
	await cacheManager.set("key1", "hello one");
	await cacheManager.set({ url: "/hello" }, "hello url");
	await cacheManager.set({ url: "/hello", method: Method.GET }, {});
	await cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });
	await cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });

	assert.equal("hello one", await cacheManager.getValue("key1"));
	assert.equal("hello url", await cacheManager.getValue({ url: "/hello" }));
	assert.deepEqual({}, await cacheManager.getValue({ url: "/hello", method: Method.GET }));
	assert.deepEqual({ greeting: "yahoo" }, await cacheManager.getValue({ url: "/hello", method: Method.POST }));
	assert.notDeepEqual({ greeting: "holla" }, await cacheManager.getValue({ url: "/hello", method: Method.POST }));
});

it('validate StorageCacheManager encryption with key encryption', async () => {
	const cacheManager1 = new LocalStorageCacheManager({ bucket, encryptor: LzEncryptor });
	const cacheManager2 = new LocalStorageCacheManager({ bucket, encryptor: LzEncryptor, encryptKey: true });

	await cacheManager1.clear();
	await cacheManager2.clear();
	await cacheManager1.set("key1", "hello one");
	await cacheManager2.set("key1", "hello one");
	await cacheManager1.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });
	await cacheManager2.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });

	assert.equal(true, await cacheManager1.has("key1"));
	assert.equal(true, await cacheManager2.has("key1"));
	assert.equal("hello one", await cacheManager1.getValue("key1"));
	assert.equal("hello one", await cacheManager2.getValue("key1"));
	assert.deepEqual({ greeting: "yahoo" }, await cacheManager1.getValue({ url: "/hello", method: Method.POST }));
	assert.deepEqual({ greeting: "yahoo" }, await cacheManager2.getValue({ url: "/hello", method: Method.POST }));
});
