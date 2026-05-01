
import assert from "assert";
import wsapp from "../../resc/wsserver";
import { Interceptor } from "../../../lib/core";
import { KyofuucObject, Utils } from "../../../lib/helper";
import { WsConfig, WsConnection } from "../../../lib/types";
import wsConnector from "../../../lib/connector/ws/wsConnector";

let server: any;
let port = 4000;
const openedWSConnections: WsConnection[] = [];

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

function closeWsConnection(wsConnection: WsConnection) {
    wsConnection.close();
    openedWSConnections.pop();
}

it('validate wsConnector connect [text#sub-protocol]', async () => {
    const wsConnection = wsConnector({
        url: `ws://127.0.0.1:${port}`,
        protocol: "text"
    });

    openedWSConnections.push(wsConnection);
    wsConnection.addEventListener('open', () => {
        assert.equal(wsConnection.protocol, "text");
        assert.equal(wsConnection.readyState, 1);
        closeWsConnection(wsConnection);
    });
    wsConnection.addEventListener('close', (e: any) => {
        assert.equal(wsConnection.readyState, 3);
    });
});


it('validate wsConnector connect [json#sub-protocol]', async () => {
    const wsConnection = wsConnector({
        url: `ws://127.0.0.1:${port}`,
        protocol: "json"
    });

    openedWSConnections.push(wsConnection);
    wsConnection.addEventListener('open', () => {
        assert.equal(wsConnection.protocol, "json");
        assert.equal(wsConnection.readyState, 1);
        closeWsConnection(wsConnection);
    });
    wsConnection.addEventListener('close', (e: any) => {
        assert.equal(wsConnection.readyState, 3);
    });
});

it('validate wsConnector test message sending [text#sub-protocol]', async () => {
    const wsConnection = wsConnector({
        url: `ws://127.0.0.1:${port}`,
        protocol: "text"
    });

    wsConnection.addEventListener('open', (e: any) => {
        assert.equal(wsConnection.readyState, 1);
        wsConnection.send("Hello World!");
        assert.equal(wsConnection.bufferedAmount, 0);
        openedWSConnections.push(wsConnection);
    });
    wsConnection.addEventListener('message', (e: any) => {
        assert.equal(e.data, "RECEIVED: Hello World!");
        closeWsConnection(wsConnection);
    });
});

it('validate wsConnector test message sending [json#sub-protocol]', async () => {
    const wsConnection = wsConnector({
        url: `ws://127.0.0.1:${port}`,
        protocol: "json"
    });

    wsConnection.addEventListener('open', (e: any) => {
        assert.equal(wsConnection.readyState, 1);
        wsConnection.send(JSON.stringify({
            message: "Hello World!"
        }));
        assert.equal(wsConnection.bufferedAmount, 0);
        openedWSConnections.push(wsConnection);
    });
    wsConnection.addEventListener('message', (e: any) => {
        const message = JSON.parse(e.data);
        assert.equal(message.received, true);
        assert.equal(message.data.type, "Buffer");
        assert.deepEqual(new TextDecoder().decode(new Uint8Array(message.data.data)), JSON.stringify({
            message: "Hello World!"
        }));
        assert.deepEqual(JSON.parse(message.received_data), {
            message: "Hello World!"
        });
        assert.deepEqual(new TextEncoder().encode(JSON.stringify({
            message: "Hello World!"
        })), new Uint8Array(message.data.data));
        closeWsConnection(wsConnection);
    });
});

it('validate wsConnector interceptor [text#sub-protocol]', async () => {
    const interceptor = new Interceptor();
    const wsConnection = wsConnector({
        url: `ws://127.0.0.1:${port}`,
        protocol: "text",
        interceptor,
    });
    const wsConnection2 = wsConnector({
        url: `ws://127.0.0.1:12345`,
        protocol: "text",
        interceptor,
    });

    interceptor.registerOnWsOpen(async (_?: WsConfig, __?: KyofuucObject<any>, event?: any) => {
        assert.equal(event.target, wsConnection);
        assert.equal(event.target.readyState, 1);
        openedWSConnections.push(wsConnection);
    });
    interceptor.registerOnWsOpen(async (_?: WsConfig, __?: KyofuucObject<any>, event?: any) => {
        assert.equal(event.target, wsConnection);
        assert.equal(event.target.readyState, 1);
        wsConnection.send("Hello World!");
        assert.equal(event.target.bufferedAmount, 0);
    });
    interceptor.registerOnWsMessage(async (_?: WsConfig, __?: KyofuucObject<any>, event?: any) => {
        assert.equal(event.target, wsConnection);
        assert.equal(event.data, "RECEIVED: Hello World!");
        closeWsConnection(event.target);
    });
    interceptor.registerOnWsClose(async (_?: WsConfig, __?: KyofuucObject<any>, event?: any) => {
        assert.equal(event.target.readyState, 3);
    });
    interceptor.registerOnWsError(async (_?: WsConfig, __?: KyofuucObject<any>, event?: any) => {
        assert.equal(event.target, wsConnection2);
        assert.equal(event.target.readyState, 2);
    });
});

it('validate wsConnector Query String Authentication [text#sub-protocol]', async () => {
    const wsConnection = wsConnector({
        url: Utils.buildUrlWithQueryFromConfig({
            query: {
                uid: "U1234",
                sid: "weytwge4578654gh5ghg"
            },
            url: `ws://127.0.0.1:${port}`,
        }),
        protocol: "text",
    });
    const wsConnection2 = wsConnector({
        url: Utils.buildUrlWithQueryFromConfig({
            query: {
                uid: "U1234",
                sid: "weytwge4578654gh5ghg___"
            },
            url: `ws://127.0.0.1:${port}`,
        }),
        protocol: "text",
    });

    assert.equal(wsConnection.url, `ws://127.0.0.1:${port}/?uid=U1234&sid=weytwge4578654gh5ghg`);
    assert.equal(wsConnection2.url, `ws://127.0.0.1:${port}/?uid=U1234&sid=weytwge4578654gh5ghg___`);
    openedWSConnections.push(wsConnection);
    wsConnection.addEventListener('open', () => {
        assert.equal(wsConnection.protocol, "text");
        assert.equal(wsConnection.readyState, 1);
        closeWsConnection(wsConnection);
    });
    wsConnection.addEventListener('close', (e: any) => {
        assert.equal(wsConnection.readyState, 3);
    });
    wsConnection2.addEventListener('close', (e: any) => {
        assert.equal(e.target.url, `ws://127.0.0.1:${port}/?uid=U1234&sid=weytwge4578654gh5ghg___`);
    });
});

