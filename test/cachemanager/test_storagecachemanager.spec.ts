
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

it('validate StorageCacheManager options', () => {
	const cacheManager1 = new LocalStorageCacheManager({ bucket });
	const cacheManager2 = new LocalStorageCacheManager<number>({ bucket });
	const cacheManager3 = new SessionStorageCacheManager<string>({ bucket });

	assert.equal(0, cacheManager1.usedSpace());
	assert.equal(0, cacheManager2.usedSpace());
	assert.equal(0, cacheManager3.usedSpace());
	assert.equal(53, cacheManager1.calculateSpace("", "1"));
	assert.equal(63, cacheManager1.calculateSpace("", "hello world"));
	assert.equal(63, cacheManager2.calculateSpace("", 1234567890197));
	assert.equal(63, cacheManager3.calculateSpace("", "hello world"));
	assert.equal(Defaults.MaxStorageSpace, cacheManager3.availableSpace());
	assert.equal(Defaults.MaxStorageSpace, cacheManager1.availableSpace());
	assert.equal(Defaults.MaxStorageSpace, cacheManager2.availableSpace());
});

it('validate StorageCacheManager set', () => {
	const cacheManager = new LocalStorageCacheManager({ bucket });

	assert.equal(0, cacheManager.usedSpace());
	assert.equal(Defaults.MaxStorageSpace, cacheManager.availableSpace());

	cacheManager.set("key1", "hello one");
	assert.equal(61, cacheManager.usedSpace());

	cacheManager.set("key2", "hello two");
	assert.equal(122, cacheManager.usedSpace());

	cacheManager.set("key1", "hello one again");
	assert.equal(128, cacheManager.usedSpace());

	cacheManager.set("key3", "hello three");
	assert.equal(191, cacheManager.usedSpace());

	cacheManager.set({ url: "/hello" }, "hello three");
	assert.equal(254, cacheManager.usedSpace());
});

it('validate StorageCacheManager no sufficient queue space left', () => {
	const cacheManager = new LocalStorageCacheManager({ bucket });

	cacheManager.clear();
	assert.doesNotThrow(() => cacheManager.set("key1", Array(111111).fill("hello one")), NoSufficientCacheSpaceLeftError);
	assert.doesNotThrow(() => cacheManager.set("key2", Array(111111).fill("hello two")), NoSufficientCacheSpaceLeftError);
	assert.doesNotThrow(() => cacheManager.set("key3", Array(111111).fill("hello three")), NoSufficientCacheSpaceLeftError);
	assert.throws(() => cacheManager.set("key4", Array(99999).fill("hello three")), NoSufficientCacheSpaceLeftError);
	assert.throws(() => cacheManager.set("key5", Array(99999).fill("hello three")), NoSufficientCacheSpaceLeftError);
	assert.throws(() => cacheManager.set("key6", Array(99999).fill("hello three")), NoSufficientCacheSpaceLeftError);
});

it('validate StorageCacheManager get', () => {
	const cacheManager = new LocalStorageCacheManager({ bucket });

	cacheManager.clear();
	cacheManager.set("key1", "hello one");
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(131, cacheManager.usedSpace());
	assert.equal("hello one", cacheManager.getValue("key1"));
	assert.equal("hello one", cacheManager.get("key1")?.value);
	assert.equal("object", typeof cacheManager.get({ url: "/hello", method: Method.POST })?.value);
	assert.equal(true, cacheManager.get({ url: "/hello", method: Method.POST })?.date instanceof Date);
	assert.deepEqual({ greeting: "holla" }, cacheManager.getValue({ url: "/hello", method: Method.POST }));
	assert.deepEqual({ greeting: "holla" }, cacheManager.get({ url: "/hello", method: Method.POST })?.value);
});

it('validate StorageCacheManager has and getValue', () => {
	const cacheManager = new SessionStorageCacheManager({ bucket });

	cacheManager.clear();
	cacheManager.set("key1", "hello one");
	cacheManager.set("key2", "hello two");
	cacheManager.set("key4", "hello four");
	cacheManager.set("key7", "hello seven");
	cacheManager.set({ url: "/hello" }, "hello url");
	cacheManager.set({ url: "/hello", method: Method.GET }, {});
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(430, cacheManager.usedSpace());
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

it('validate StorageCacheManager remove and clear', () => {
	const cacheManager = new SessionStorageCacheManager({ bucket });
	
	cacheManager.clear();
	cacheManager.set("key1", "hello one");
	cacheManager.set("key2", "hello two");
	cacheManager.set("key3", "hello three");
	cacheManager.set({ url: "/hello", method: Method.GET }, {});
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(307, cacheManager.usedSpace());
	cacheManager.remove("key2");
	cacheManager.remove({ url: "/hello/world", method: Method.GET });
	assert.equal(246, cacheManager.usedSpace());
	cacheManager.remove("key3");
	cacheManager.remove({ url: "/hello", method: Method.GET });
	assert.equal(131, cacheManager.usedSpace());

	cacheManager.clear();
	assert.equal(0, cacheManager.usedSpace());
});

it('validate StorageCacheManager encryption', () => {
	const cacheManager = new SessionStorageCacheManager({ bucket, encryptor: LzEncryptor });

	cacheManager.clear();
	cacheManager.set("key1", "hello one");
	cacheManager.set({ url: "/hello" }, "hello url");
	cacheManager.set({ url: "/hello", method: Method.GET }, {});
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });

	assert.equal("hello one", cacheManager.getValue("key1"));
	assert.equal("hello url", cacheManager.getValue({ url: "/hello" }));
	assert.deepEqual({}, cacheManager.getValue({ url: "/hello", method: Method.GET }));
	assert.deepEqual({ greeting: "yahoo" }, cacheManager.getValue({ url: "/hello", method: Method.POST }));
	assert.notDeepEqual({ greeting: "holla" }, cacheManager.getValue({ url: "/hello", method: Method.POST }));
});

it('validate StorageCacheManager encryption with key encryption', () => {
	const cacheManager1 = new LocalStorageCacheManager({ bucket, encryptor: LzEncryptor });
	const cacheManager2 = new LocalStorageCacheManager({ bucket, encryptor: LzEncryptor, encryptKey: true });

	cacheManager1.clear();
	cacheManager2.clear();
	cacheManager1.set("key1", "hello one");
	cacheManager2.set("key1", "hello one");
	cacheManager1.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });
	cacheManager2.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });

	assert.equal(true, cacheManager1.has("key1"));
	assert.equal(true, cacheManager2.has("key1"));
	assert.equal("hello one", cacheManager1.getValue("key1"));
	assert.equal("hello one", cacheManager2.getValue("key1"));
	assert.deepEqual({ greeting: "yahoo" }, cacheManager1.getValue({ url: "/hello", method: Method.POST }));
	assert.deepEqual({ greeting: "yahoo" }, cacheManager2.getValue({ url: "/hello", method: Method.POST }));
});
