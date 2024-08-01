
import assert from "assert";
import { Method } from "../../lib/types";
import { Defaults } from "../../lib/helper";
import { LzEncryptor } from "../resc/LzEncryptor";
import { MapCacheManager } from "../../lib/cachemanager";
import { NoSufficientCacheSpaceLeftError } from "../../lib/exception";

it('validate MapCacheManager options', () => {
	const cacheManager1 = new MapCacheManager<number>();
	const cacheManager2 = new MapCacheManager({ maxEntries: 2 });
	const cacheManager3 = new MapCacheManager<string>({ bucket: {} });

	assert.equal(0, cacheManager1.usedSpace());
	assert.equal(0, cacheManager2.usedSpace());
	assert.equal(0, cacheManager3.usedSpace());
	assert.equal(2, cacheManager2.availableSpace());
	assert.equal(1, cacheManager1.calculateSpace("", 1));
	assert.equal(1, cacheManager2.calculateSpace("", "1"));
	assert.equal(1, cacheManager2.calculateSpace("", "one"));
	assert.equal(1, cacheManager3.calculateSpace("", "two"));
	assert.equal(Defaults.MaxObjectEntrySize, cacheManager1.availableSpace());
	assert.equal(Defaults.MaxObjectEntrySize, cacheManager3.availableSpace());
});

it('validate MapCacheManager set', () => {
	const cacheManager = new MapCacheManager();

	assert.equal(0, cacheManager.usedSpace());
	assert.equal(Defaults.MaxObjectEntrySize, cacheManager.availableSpace());

	cacheManager.set("key1", "hello one");
	assert.equal(1, cacheManager.usedSpace());

	cacheManager.set("key2", "hello two");
	assert.equal(2, cacheManager.usedSpace());

	cacheManager.set("key1", "hello one again");
	assert.equal(2, cacheManager.usedSpace());

	cacheManager.set("key3", "hello three");
	assert.equal(3, cacheManager.usedSpace());

	cacheManager.set({ url: "/hello" }, "hello three");
	assert.equal(4, cacheManager.usedSpace());
});

it('validate MapCacheManager no sufficient queue space left', () => {
	const cacheManager = new MapCacheManager({ maxEntries: 2 });

	assert.doesNotThrow(() => cacheManager.set("key1", "hello one"), NoSufficientCacheSpaceLeftError);
	assert.doesNotThrow(() => cacheManager.set("key2", "hello two"), NoSufficientCacheSpaceLeftError);
	assert.throws(() => cacheManager.set("key3", "hello three"), NoSufficientCacheSpaceLeftError);
	assert.throws(() => cacheManager.set("key4", "hello three"), NoSufficientCacheSpaceLeftError);
	assert.throws(() => cacheManager.set("key5", "hello three"), NoSufficientCacheSpaceLeftError);
});

it('validate MapCacheManager get', () => {
	const cacheManager = new MapCacheManager();

	cacheManager.set("key1", "hello one");
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(2, cacheManager.usedSpace());
	assert.equal("hello one", cacheManager.getValue("key1"));
	assert.equal("hello one", cacheManager.get("key1")?.value);
	assert.equal("object", typeof cacheManager.get({ url: "/hello", method: Method.POST })?.value);
	assert.equal(true, cacheManager.get({ url: "/hello", method: Method.POST })?.date instanceof Date);
	assert.deepEqual({ greeting: "holla" }, cacheManager.getValue({ url: "/hello", method: Method.POST }));
	assert.deepEqual({ greeting: "holla" }, cacheManager.get({ url: "/hello", method: Method.POST })?.value);
});

it('validate MapCacheManager has and getValue', () => {
	const cacheManager = new MapCacheManager();

	cacheManager.set("key1", "hello one");
	cacheManager.set("key2", "hello two");
	cacheManager.set("key4", "hello four");
	cacheManager.set("key7", "hello seven");
	cacheManager.set({ url: "/hello" }, "hello url");
	cacheManager.set({ url: "/hello", method: Method.GET }, {});
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(7, cacheManager.usedSpace());
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

it('validate MapCacheManager remove and clear', () => {
	const cacheManager = new MapCacheManager();
	
	cacheManager.set("key1", "hello one");
	cacheManager.set("key2", "hello two");
	cacheManager.set("key3", "hello three");
	cacheManager.set({ url: "/hello", method: Method.GET }, {});
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });

	assert.equal(5, cacheManager.usedSpace());
	cacheManager.remove("key2");
	cacheManager.remove({ url: "/hello/world", method: Method.GET });
	assert.equal(4, cacheManager.usedSpace());
	cacheManager.remove("key3");
	cacheManager.remove({ url: "/hello", method: Method.GET });
	assert.equal(2, cacheManager.usedSpace());

	cacheManager.clear();
	assert.equal(0, cacheManager.usedSpace());
});

it('validate MapCacheManager encryption', () => {
	const cacheManager = new MapCacheManager({ encryptor: LzEncryptor });

	cacheManager.set("key1", "hello one");
	cacheManager.set({ url: "/hello" }, "hello url");
	cacheManager.set({ url: "/hello", method: Method.GET }, {});
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "holla" });
	cacheManager.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });

	assert.equal(4, cacheManager.usedSpace());
	assert.equal("hello one", cacheManager.getValue("key1"));
	assert.equal("hello url", cacheManager.getValue({ url: "/hello" }));
	assert.deepEqual({}, cacheManager.getValue({ url: "/hello", method: Method.GET }));
	assert.deepEqual({ greeting: "yahoo" }, cacheManager.getValue({ url: "/hello", method: Method.POST }));
	assert.notDeepEqual({ greeting: "holla" }, cacheManager.getValue({ url: "/hello", method: Method.POST }));
});

it('validate MapCacheManager encryption with key encryption', () => {
	const cacheManager1 = new MapCacheManager({ encryptor: LzEncryptor });
	const cacheManager2 = new MapCacheManager({ encryptor: LzEncryptor, encryptKey: true });

	cacheManager1.set("key1", "hello one");
	cacheManager2.set("key1", "hello one");
	cacheManager1.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });
	cacheManager2.set({ url: "/hello", method: Method.POST }, { greeting: "yahoo" });

	assert.equal(2, cacheManager1.usedSpace());
	assert.equal(2, cacheManager2.usedSpace());
	assert.equal(true, cacheManager1.has("key1"));
	assert.equal(true, cacheManager2.has("key1"));
	assert.equal("hello one", cacheManager1.getValue("key1"));
	assert.equal("hello one", cacheManager2.getValue("key1"));
	assert.deepEqual({ greeting: "yahoo" }, cacheManager1.getValue({ url: "/hello", method: Method.POST }));
	assert.deepEqual({ greeting: "yahoo" }, cacheManager2.getValue({ url: "/hello", method: Method.POST }));
});
