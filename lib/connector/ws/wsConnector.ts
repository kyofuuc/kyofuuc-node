
import { HandlerType } from "../../core";
import classes from "../../helper/node_classes";
import { WsConfig, WsConnection } from "../../types";

export default function wsConnector(config: WsConfig): WsConnection {
	if (config.dynamicConfig) config = config.dynamicConfig(config) as WsConfig;
	const socket = new classes.WebSocket(config.url, config.protocol);
	socket.addEventListener('open', (e: any) => config.interceptor?.invoke(HandlerType.WS_OPEN, config, e));
	socket.addEventListener('close', (e: any) => config.interceptor?.invoke(HandlerType.WS_CLOSE, config, e));
	socket.addEventListener('error', (e: any) => config.interceptor?.invoke(HandlerType.WS_ERROR, config, e));
	socket.addEventListener('message', (e: any) => config.interceptor?.invoke(HandlerType.WS_MESSAGE, config, e));
	socket.name = "wsConnector";

	return socket;
}

module.exports = wsConnector;
