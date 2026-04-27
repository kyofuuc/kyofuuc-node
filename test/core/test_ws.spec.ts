
import assert from "assert";
import ffs from "../../lib";
import wsapp from "../resc/wsserver";
import { IWs, Interceptor, Ws, WsState } from "../../lib/core";
import { KyofuucObject, Utils } from "../../lib/helper";
import { WsConfig, WsConnection } from "../../lib/types";
import wsConnector from "../../lib/connector/ws/wsConnector";

let server: any;
let port = 4000;
const openedWSConnections: IWs[] = [];

/*before((done) => {
	const startServer = (count: number, done: any) => {
		if (count >= 5) return;
		server = (new (wsapp as any)()).listen(port, done).on('error', (e: any) => {
			port++;
			startServer(++count, done);
		});
	}
	startServer(0, done);
});

after(done => {
	let intervalId = setInterval(function () {
		if (openedWSConnections.length === 0) {
			server.close(done);
			clearInterval(intervalId);
		}
	}, 1000);
});*/

function closeWsConnection(ws: IWs) {
	ws.close();
	openedWSConnections.pop();
}

it('validate kyofuuc ws connect [text#sub-protocol]', () => {
	const ws = Ws.ws({
		url: "ws://127.0.0.1:4000",
		protocol: "text",
	});

	ws.onOpen((_: IWs, __: any) => {
		assert.equal(ws.getState(), WsState.READY);
		ws.close();
	});
	ws.onClose((_: IWs, event) => {
		assert.equal(ws.getState(), WsState.DISCONNECTED);
	});
});

it('validate kyofuuc ws connect [json#sub-protocol]', () => {
	const ws = ffs.ws({
		url: "ws://127.0.0.1:4000",
		protocol: "json"
	});

	ws.onOpen((_: IWs, __: any) => {
		assert.equal(ws.getState(), WsState.CONNECTED);
		ws.close();
	});
	ws.onClose((_: IWs, __: any) => {
		assert.equal(ws.getState(), WsState.DISCONNECTED);
	});
});

it('validate kyofuuc ws test message sending [text#sub-protocol]', () => {
	const ws = ffs.ws({
		url: "ws://127.0.0.1:4000",
		protocol: "text"
	});

	ws.onOpen((_: IWs, __: any) => {
		assert.equal(ws.getState(), WsState.CONNECTED);
		ws.sendMessage("Hello World!");
		assert.equal(ws.getBufferedAmount(), 0);
		openedWSConnections.push(ws);
	});
	ws.onMessage((_: IWs, __: any, message: any) => {
		assert.equal(message, "RECEIVED: Hello World!");
		closeWsConnection(ws);
	});
});

it('validate kyofuuc ws test message sending [json#sub-protocol]', () => {
	const ws = ffs.ws({
		url: "ws://127.0.0.1:4000",
		protocol: "json"
	});

	ws.onOpen((_: IWs, __: any) => {
		assert.equal(ws.getState(), WsState.READY);
		ws.sendMessage({
			message: "Hello World!"
		});
		assert.equal(ws.getBufferedAmount(), 0);
		openedWSConnections.push(ws);
	});
	ws.onMessage((_: IWs, __: any, message: any) => {
		assert.equal(message.received, true);
		assert.equal(message.data.type, "Buffer");
		assert.deepEqual(JSON.parse(message.received_data), {
			message: "Hello World!"
		});
		assert.deepEqual(JSON.parse(new TextDecoder().decode(new Uint8Array(message.data.data))), {
			message: "Hello World!"
		});
		closeWsConnection(ws);
	});
});

it('validate kyofuuc ws Query String Authentication [text#sub-protocol]', () => {
	const ws1 = ffs.ws({
		url: Utils.buildUrlWithQueryFromConfig({
			query: {
				uid: "U1234",
				sid: "weytwge4578654gh5ghg"
			},
			url: `ws://127.0.0.1:4000`,
		}),
		protocol: "text",
	});
	const ws2 = ffs.ws({
		url: Utils.buildUrlWithQueryFromConfig({
			query: {
				uid: "U1234",
				sid: "weytwge4578654gh5ghg___"
			},
			url: `ws://127.0.0.1:4000`,
		}),
		protocol: "text",
	});

	assert.equal(ws1.getUrl(), "ws://127.0.0.1:4000?uid=U1234&sid=weytwge4578654gh5ghg");
	assert.equal(ws2.getUrl(), "ws://127.0.0.1:4000?uid=U1234&sid=weytwge4578654gh5ghg___");
	ws1.onOpen((_: IWs, __: any) => {
		assert.equal(ws1.getState(), WsState.CONNECTED);
		ws1.close();
	});
	ws1.onClose((_: IWs, __: any) => {
		assert.equal(ws1.getState(), WsState.DISCONNECTED);
	});
	ws2.onClose((_: IWs, __: any) => {
		assert.equal(ws2.getState(), WsState.DISCONNECTED);
		assert.equal(ws2.getUrl(), "ws://127.0.0.1:4000?uid=U1234&sid=weytwge4578654gh5ghg___");
	});
});

it('validate kyofuuc ws reconnect [text#sub-protocol]', () => {
	const ws1 = ffs.ws({
		url: "ws://127.0.0.1:4000",
		protocol: "text",
		reconnect: true,
		maxReconnect: 10,
	});
	let reconnectionCount1 = 0;

	ws1.onOpen((ws: IWs, event: any) => {
		reconnectionCount1++;
		assert.equal(ws1.getState(), WsState.CONNECTED);
		event.target.close();
	});
	ws1.onClose((_: IWs, __: any) => {
		assert.equal(ws1.getLastReconnectionCount(), 10);
		assert.equal(ws1.getState(), WsState.DISCONNECTED);
		assert.equal(reconnectionCount1 - 1, ws1.getLastReconnectionCount());
	});
});

function getDateDiffInSeconds(date1: Date, date2: Date) {
	var dif = date1.getTime() - date2.getTime();
	var secondsFrom = dif / 1000;
	return Math.floor(Math.abs(secondsFrom));
}

it('validate kyofuuc ws reconnect interval [text#sub-protocol]', () => {
	const ws1 = ffs.ws({
		url: "ws://127.0.0.1:4000",
		protocol: "text",
		reconnect: true,
		maxReconnect: 3,
		reconnectInterval: 2
	});
	let reconnectionCount = 0;

	ws1.onOpen((_: IWs, event: any) => {
		reconnectionCount++;
		assert.equal(ws1.getState(), WsState.CONNECTED);
		event.target.close();
		if (reconnectionCount === 1) {
			openedWSConnections.push(ws1);
		}
	});
	ws1.onClose((_: IWs, __: any) => {
		assert.equal(ws1.getLastReconnectionCount(), 3);
		assert.equal(ws1.getState(), WsState.DISCONNECTED);
		closeWsConnection(ws1);
	});

	let firstTime: any;
	ws1.onStateChange((_: IWs, state: WsState) => {
		if (state === WsState.RECONNECTING) {
			if (reconnectionCount === 1) {
				firstTime = new Date();
			} else {
				assert.equal(getDateDiffInSeconds(firstTime, new Date()), (ws1.getLastReconnectionCount() - 1) * 2);
			}
		}
	});
});

it('validate kyofuuc ws reconnect interval with interval multiples [text#sub-protocol]', () => {
	const ws1 = ffs.ws({
		url: "ws://127.0.0.1:4000",
		protocol: "text",
		reconnect: true,
		maxReconnect: 3,
		reconnectInterval: 2,
		reconnectIntervalByPower: true
	});
	let reconnectionCount = 0;

	ws1.onOpen((_: IWs, event: any) => {
		reconnectionCount++;
		assert.equal(ws1.getState(), WsState.CONNECTED);
		event.target.close();
		if (reconnectionCount === 1) {
			openedWSConnections.push(ws1);
		}
	});
	ws1.onClose((_: IWs, __: any) => {
		assert.equal(ws1.getLastReconnectionCount(), 3);
		assert.equal(ws1.getState(), WsState.DISCONNECTED);
		closeWsConnection(ws1);
	});

	let firstTime: any;
	ws1.onStateChange((_: IWs, state: WsState) => {
		if (state === WsState.READY) {
			firstTime = new Date();
		} else if (state === WsState.RECONNECTING) {
			let currentTime = new Date();
			assert.equal(getDateDiffInSeconds(firstTime, currentTime), Math.pow(2, ws1.getLastReconnectionCount()));
			firstTime = currentTime;
		}
	});
});

