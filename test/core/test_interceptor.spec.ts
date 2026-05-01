
import assert from "assert";
import { HandlerType, Interceptor } from "../../lib/core";

it('validate Interceptor constructor', () => {
	const interceptor1 = new Interceptor();
	const interceptor2 = new Interceptor();

	assert.equal(0, interceptor1.count());
	assert.equal(0, interceptor2.count());
	interceptor1.register({ type: HandlerType.HTTP_PRE_REQUEST, cb: async () => { }, when: () => true });
	interceptor1.register({ type: HandlerType.HTTP_POST_REQUEST, cb: async () => { }, when: () => true });
	interceptor2.register({ type: HandlerType.HTTP_POST_RESPONSE, cb:async () => { }, when: () => true });
	const interceptor3 = new Interceptor([ interceptor1, interceptor2 ]);
	assert.equal(2, interceptor1.count());
	assert.equal(1, interceptor2.count());
	assert.equal(3, interceptor3.count());
});

it('validate Interceptor initialize and register and unregister', () => {
	const interceptor = new Interceptor();

	assert.equal(0, interceptor.count());
	const key1 = interceptor.register({ type: HandlerType.HTTP_PRE_REQUEST, cb: async () => { }, when: () => true });
	const key2 = interceptor.register({ type: HandlerType.HTTP_POST_REQUEST, cb: async () => { }, when: () => false });
	assert.equal("string", typeof key1);
	assert.equal("string", typeof key2);
	assert.equal(2, interceptor.count());

	assert.equal(true, interceptor.handler(key1)?.when!());
	assert.equal(false, interceptor.handler(key2)?.when!());

	interceptor.unregister(key1);
	assert.equal(1, interceptor.count());
});

it('validate Interceptor typed registers', () => {
	const interceptor = new Interceptor();

	assert.equal(0, interceptor.count());
	const key1 = interceptor.registerOnWsOpen(async () => { });
	const key2 = interceptor.registerOnWsClose(async () => { });
	const key3 = interceptor.registerOnWsError(async () => { });
	const key4 = interceptor.registerPreRequest(async () => { });
	const key5 = interceptor.registerPostRequest(async () => { });
	const key6 = interceptor.registerPreResponse(async () => { });
	const key7 = interceptor.registerOnWsMessage(async () => { });
	const key8 = interceptor.registerPostResponse(async () => { });
	const key9 = interceptor.registerOnWsStateChange(async () => { });
	assert.equal("string", typeof key1);
	assert.equal("string", typeof key2);
	assert.equal("string", typeof key3);
	assert.equal("string", typeof key4);
	assert.equal("string", typeof key5);
	assert.equal("string", typeof key6);
	assert.equal("string", typeof key7);
	assert.equal("string", typeof key8);
	assert.equal("string", typeof key9);
	assert.equal(9, interceptor.count());

	interceptor.unregister(key1);
	interceptor.unregister(key2);
	interceptor.unregister(key3);
	interceptor.unregister(key4);
	assert.equal(5, interceptor.count());
});

it('validate Interceptor handlers', () => {
	const interceptor = new Interceptor();

	assert.equal("string", typeof interceptor.register({ type: HandlerType.HTTP_PRE_REQUEST, cb: async () => { }, when: () => true }));
	assert.equal("string", typeof interceptor.register({ type: HandlerType.HTTP_PRE_REQUEST, cb: async () => { }, when: () => false }));
	assert.equal("string", typeof interceptor.register({ type: HandlerType.HTTP_POST_REQUEST, cb: async () => { }, when: () => true }));
	assert.equal("string", typeof interceptor.register({ type: HandlerType.HTTP_POST_REQUEST, cb: async () => { }, when: () => true }));
	assert.equal("string", typeof interceptor.register({ type: HandlerType.HTTP_POST_REQUEST, cb: async () => { }, when: () => true }));

	assert.equal(2, interceptor.handlers(HandlerType.HTTP_PRE_REQUEST).length);
	assert.equal(3, interceptor.handlers(HandlerType.HTTP_POST_REQUEST).length);
});

it('validate Interceptor invoke', async () => {
	const interceptor = new Interceptor();

	assert.equal("string", typeof interceptor.register({ type: HandlerType.HTTP_PRE_REQUEST, cb: async () => { }, when: () => true }));
	assert.equal("string", typeof interceptor.register({ type: HandlerType.HTTP_PRE_REQUEST, cb: async () => { }, when: () => false }));
	assert.equal("string", typeof interceptor.register({ type: HandlerType.HTTP_POST_REQUEST, cb: async () => { }, when: () => true }));
	assert.equal("string", typeof interceptor.register({ type: HandlerType.HTTP_POST_REQUEST, cb: async () => { }, when: () => true }));
	assert.equal("string", typeof interceptor.register({
		type: HandlerType.HTTP_POST_REQUEST, cb: async () => {
			return {};
		}, when: () => true
	}));
	assert.equal("string", typeof interceptor.register({
		type: HandlerType.HTTP_POST_REQUEST, cb: async () => {
			return {};
		}
	}));
	assert.equal("string", typeof interceptor.register({
		type: HandlerType.HTTP_POST_REQUEST, cb: async () => {
			return {};
		}, when: () => false
	}));

	assert.equal(0, (await interceptor.invoke(HandlerType.HTTP_PRE_REQUEST)).length);
	assert.equal(2, (await interceptor.invoke(HandlerType.HTTP_POST_REQUEST)).length);
});

it('validate Interceptor registers and purge', () => {
	const interceptor1 = new Interceptor();
	const interceptor2 = new Interceptor();
	const interceptor3 = new Interceptor();

	assert.equal(0, interceptor1.count());
	assert.equal(0, interceptor2.count());
	assert.equal(0, interceptor3.count());
	interceptor1.register({ type: HandlerType.HTTP_PRE_REQUEST, cb: async () => { }, when: () => true });
	interceptor1.register({ type: HandlerType.HTTP_POST_REQUEST, cb: async () => { }, when: () => true });
	interceptor2.register({ type: HandlerType.HTTP_POST_RESPONSE, cb: async () => { }, when: () => true });
	interceptor3.registers([ interceptor1, interceptor2 ]);
	assert.equal(2, interceptor1.count());
	assert.equal(1, interceptor2.count());
	assert.equal(3, interceptor3.count());

	interceptor2.purge();
	interceptor3.purge();
	assert.equal(0, interceptor2.count());
	assert.equal(0, interceptor3.count());
});
