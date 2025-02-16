
import assert from "assert";
import ffs from "../../lib";
import app from "../resc/server";
import { MapCacheManager } from "../../lib/cachemanager";
import { Method, ResponseType, Response } from "../../lib/types";
import xhrConnector from "../../lib/connector/http/xhrConnector";
import { EventQueue, EventQueueType, Http } from "../../lib/core";
import httpConnector from "../../lib/connector/http/httpConnector";

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

it('validate http base config', () => {
	const http = new Http();

	assert.equal(true, typeof http.put === 'function');
	assert.equal(true, typeof http.get === 'function');
	assert.equal(true, typeof http.head === 'function');
	assert.equal(true, typeof http.post === 'function');
	assert.equal(true, typeof http.patch === 'function');
	assert.equal(true, typeof http.delete === 'function');
	assert.equal(true, typeof http.request === 'function');
	assert.equal(true, typeof http.options === 'function');
});

it('http request server greet', async () => {
	const response = await Http.getInstance().request(`http://127.0.0.1:${port}/greet`, { method: Method.GET });

	assert.equal(response.status, 200);
	assert.equal(response.data, "Hello World!");
});

it('kyofuuc request delete, get, head, options', async () => {
	const ffsResponseHead = await ffs.request(`http://127.0.0.1:${port}/head`, { method: Method.HEAD, responseType: ResponseType.TEXT });
	const ffsResponseOptions = await ffs.request(`http://127.0.0.1:${port}/options`, { method: Method.OPTIONS, responseType: ResponseType.TEXT });
	const ffsResponseGet = await Http.getInstance().request(`http://127.0.0.1:${port}/get`, { method: Method.GET, responseType: ResponseType.TEXT });
	const ffsResponseDelete = await Http.getInstance().request(`http://127.0.0.1:${port}/delete`, { method: Method.DELETE, responseType: ResponseType.TEXT });

	assert.equal(ffsResponseGet.status, 204);
	assert.equal(ffsResponseHead.status, 204);
	assert.equal(ffsResponseDelete.status, 204);
	assert.equal(ffsResponseOptions.status, 204);
});

it('http request server greet httpConnector', async () => {
	const response = await Http.getInstance().request(`http://127.0.0.1:${port}/greet`, { connector: httpConnector, method: Method.GET });

	assert.equal(response.status, 200);
	assert.equal(response.data, "Hello World!");
});

it('http request server greet xhrConnector', async () => {
	const response = await Http.getInstance().request(`http://127.0.0.1:${port}/greet`, { connector: xhrConnector, method: Method.GET });

	assert.equal(response.status, 200);
	assert.equal(response.data, "Hello World!");
});

it('validate kyofuuc httpConnector request delete, get, head, options', async () => {
	const ffsResponseHead = await ffs.request(`http://127.0.0.1:${port}/head`, { connector: httpConnector, method: Method.HEAD, responseType: ResponseType.TEXT });
	const ffsResponseOptions = await ffs.request(`http://127.0.0.1:${port}/options`, { connector: httpConnector, method: Method.OPTIONS, responseType: ResponseType.TEXT });
	const ffsResponseGet = await Http.getInstance().request(`http://127.0.0.1:${port}/get`, { connector: httpConnector, method: Method.GET, responseType: ResponseType.TEXT });
	const ffsResponseDelete = await Http.getInstance().request(`http://127.0.0.1:${port}/delete`, { connector: httpConnector, method: Method.DELETE, responseType: ResponseType.TEXT });

	assert.equal(ffsResponseGet.status, 204);
	assert.equal(ffsResponseHead.status, 204);
	assert.equal(ffsResponseDelete.status, 204);
	assert.equal(ffsResponseOptions.status, 204);
});

it('validate kyofuuc xhrConnector request delete, get, head, options', async () => {
	const ffsResponseHead = await ffs.request(`http://127.0.0.1:${port}/head`, { connector: xhrConnector, method: Method.HEAD, responseType: ResponseType.TEXT });
	const ffsResponseOptions = await ffs.request(`http://127.0.0.1:${port}/options`, { connector: xhrConnector, method: Method.OPTIONS, responseType: ResponseType.TEXT });
	const ffsResponseGet = await Http.getInstance().request(`http://127.0.0.1:${port}/get`, { connector: xhrConnector, method: Method.GET, responseType: ResponseType.TEXT });
	const ffsResponseDelete = await Http.getInstance().request(`http://127.0.0.1:${port}/delete`, { connector: xhrConnector, method: Method.DELETE, responseType: ResponseType.TEXT });

	assert.equal(ffsResponseGet.status, 204);
	assert.equal(ffsResponseHead.status, 204);
	assert.equal(ffsResponseDelete.status, 204);
	assert.equal(ffsResponseOptions.status, 204);
});

it('kyofuuc request post, patch, put', async () => {
	const ffsResponsePost = await ffs.request({
		url: `http://127.0.0.1:${port}/post`,
		method: Method.POST,
		headers: {
			"User-Agent": "kyofuuc/0.01",
			'Content-Type': 'application/json'
		},
		data: {
			email: "test@mail.com",
			password: "pass"
		},
		responseType: "json"
	});
	const ffsResponsePatch = await ffs.request({
		url: `http://127.0.0.1:${port}/patch`,
		method: Method.PATCH,
		headers: {
			"User-Agent": "kyofuuc/0.01",
			'Content-Type': 'application/json'
		},
		data: {
			email: "test@mail.com",
			password: "pass"
		},
		responseType: "json"
	});
	const ffsResponsePut = await ffs.request({
		url: `http://127.0.0.1:${port}/put`,
		method: Method.PUT,
		headers: {
			"User-Agent": "kyofuuc/0.01",
			'Content-Type': 'application/json'
		},
		data: {
			email: "test@mail.com",
			password: "pass"
		},
		responseType: "json"
	});

	assert.equal(ffsResponsePut.status, 200);
	assert.equal(ffsResponsePost.status, 200);
	assert.equal(ffsResponsePatch.status, 200);
	assert.equal(ffsResponsePut.data.password, "pass");
	assert.equal(ffsResponsePost.data.password, "pass");
	assert.equal(ffsResponsePatch.data.password, "pass");
	assert.equal(ffsResponsePut.data.email, "test@mail.com");
	assert.equal(ffsResponsePost.data.email, "test@mail.com");
	assert.equal(ffsResponsePatch.data.email, "test@mail.com");
});

it('kyofuuc request basic auth', async () => {
	const ffsResponse1 = await ffs.request({
		url: `http://127.0.0.1:${port}/profile`,
		method: "GET",
		responseType: "json",
		validateStatus: (status) => {
			return status >= 200 && status < 500;
		}
	});
	const ffsResponse2 = await ffs.request({
		url: `http://127.0.0.1:${port}/profile`,
		method: "GET",
		auth: {
			username: "test.wrong@mail.com",
			password: "password"
		},
		responseType: "json",
		validateStatus: (status) => {
			return status >= 200 && status < 500;
		}
	});
	const ffsResponse3 = await ffs.request({
		url: `http://127.0.0.1:${port}/profile`,
		method: "GET",
		auth: {
			username: "test@mail.com",
			password: "password"
		},
		responseType: "json"
	});
	const ffsResponse4 = await ffs.request({
		url: `http://test.wrong@mail.com:password@127.0.0.1:${port}/profile`,
		method: "GET",
		responseType: "json",
		validateStatus: (status) => {
			return status >= 200 && status < 500;
		}
	});
	const ffsResponse5 = await ffs.request({
		url: `http://test@mail.com:password@127.0.0.1:${port}/profile`,
		responseType: "json"
	});

	assert.equal(ffsResponse1.status, 400);
	assert.equal(ffsResponse2.status, 401);
	assert.equal(ffsResponse3.status, 200);
	assert.equal(ffsResponse4.status, 401);
	assert.equal(ffsResponse5.status, 200);
	assert.equal(ffsResponse3.data.message, "Success");
	assert.equal(ffsResponse5.data.message, "Success");
	assert.equal(ffsResponse1.data.message, "Missing Authorization Header");
	assert.equal(ffsResponse2.data.message, "Invalid Authentication Credentials");
	assert.equal(ffsResponse4.data.message, "Invalid Authentication Credentials");
});

it('kyofuuc request retry', async () => {
	let rserver: any;
	let successful = 0;
	const cacheManager = MapCacheManager.getInstance(); cacheManager.clear();

	EventQueue.getInstance().subscribe(EventQueueType.HTTP_REQUEST, (response: Response) => {
		successful++;
		if (successful === 1) assert.equal(response.status, 200);
		if (successful === 2) assert.equal(response.status, 204);
		if (successful >= 2) {
			rserver?.close();
		}
	})

	Http.getInstance().request(`http://127.0.0.1:2901/greet`, {
		cacheManager,
		retry: true,
		method: "get",
		responseType: "text",
		subscriptionKey: EventQueueType.HTTP_REQUEST,
	}).then(response => {
		assert.equal(response.status, 150);
		assert.equal(response.statusText, "Awaiting Retry");
	}).catch(error => {
		console.error(error.toJSON());
	});
	Http.getInstance().get(`http://127.0.0.1:2901/get`, {
		cacheManager,
		retry: true,
		responseType: "text",
		subscriptionKey: EventQueueType.HTTP_REQUEST,
	}).then(response => {
		assert.equal(response.status, 150);
		assert.equal(response.statusText, "Awaiting Retry");
		rserver = app.listen(2901, () => {
			ffs.retryRequests(cacheManager);
		}).on('error', (e) => { });
	}).catch(error => {
		console.error(error.toJSON());
	});
});

it('kyofuuc request maxRetry for retry', async () => {
	function processResponse(response: Response) {
		assert.equal(response.status, 150);
		assert.equal(response.statusText, "Awaiting Retry");
		ffs.retryRequests();
	};
	EventQueue.getInstance().subscribe("maximum_retry_test_call", processResponse)

	Http.getInstance().request(`http://127.0.0.1:2901/greet`, {
		maxRetry: 4,
		retry: true,
		method: "get",
		responseType: "text",
		cacheManager: MapCacheManager.getInstance(),
		subscriptionKey: "maximum_retry_test_call",
	}).then(processResponse).catch(error => {
		console.error(error.toJSON());
	});
});


