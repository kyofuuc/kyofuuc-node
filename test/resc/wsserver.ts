
const WS = require('ws');
const url = require('url');

function onMessage(ws: any, message: any) {
	if (ws.protocol === "json") {
		ws.send(JSON.stringify({
			received: true,
			received_data: `${message}`,
			data: message
		}));
	} else {
		ws.send(`RECEIVED: ${message}`);
	}
}
let wss;
function onConnect(ws: any, req: any) {
	const params = new URLSearchParams(url.parse(req.url).query);
	if (params.get('uid')) {
		let uid = params.get('uid');
		let sid = params.get('sid');
		if (!(uid === "U1234" && sid === "weytwge4578654gh5ghg")) {
			ws.close();
		}
	}
	ws.on('message', (message: any) => onMessage(ws, message));
}

class WSServer {

	wss: any;
	port: number;
	eventListeners: any;

	constructor() {
		this.port = 4000;
		this.wss = undefined;
		this.eventListeners = [];
	}

}

(WSServer.prototype as any).on = function on(event: any, callback: any) {
	this.eventListeners.push({
		event,
		callback
	});
	return this;
};

(WSServer.prototype as any).sendEvent = function sendEvent(event: any, arg: any) {
	for (let eventListener of this.eventListeners) {
		if (eventListener.event === event) {
			eventListener.callback(arg);
		}
	}
	return this;
};

(WSServer.prototype as any).listen = function listen(port: any, callback: any) {
	this.port = port;
	this.eventListeners = [];
	this.wss = new WS.Server({ port: port }, callback).on("error", (err: any) => {
		this.sendEvent("error", err);
	});
	this.wss.on('connection', onConnect);
	wss = this.wss;
	return this;
};

(WSServer.prototype as any).close = function close(callback: any) {
	if (this.wss) {
		this.wss.close(callback);
		this.wss = undefined;
	}
	return this;
};

export default WSServer;
