# @mikosoft/ws-server
> Ultra fast Websocket Server with builtin JS framework for creating real-time, complex apps.

The library is made for **NodeJS** platform according to [RFC6455 Standard](https://tools.ietf.org/html/rfc6455) and websocket version 13.

Very clean code with straightforward logic and no dependencies.



## Websocket Server Features
- RFC6455, websocket v.13
- NodeJS v10+
- **no dependencies**
- internal HTTP server
- socket (client) authentication
- limit total number of the connected clients
- limit the number of connected clients per IP
- rooms (grouped websocket clients)
- built-in router
- possible RxJS integration



## Installation
```
npm install --save @mikosoft/ws-server
```

## Example
```js
const { WsServer, WsHttpServer, lib } = require('@mikosoft/ws-server);

// start internal HTTP server
const httpOpts = {
  port: 3211,
  timeout: 0 // if 0 the socket connection will never timeout
};
const wsHttpServer = new WsHttpServer(httpOpts);
const httpServer = wsHttpServer.start(); // nodeJS HTTP server instance
setTimeout(() => {
  // wsHttpServer.restart();
  // wsHttpServer.stop();
}, 3400);

// websocket server
const wsOpts = {
  timeout: 5 * 60 * 1000, // close socket after ms inactivity. If 0 never close. Default: 5min.
  allowHalfOpen: false, // if false close socket if it's readyState is writeOnly or readOnly. When NginX timeout socket on the client side [Client -X- NginX --- WSServer(NodeJS)]
  maxConns: 10000, // limit connections to the server
  maxIPConns: 3, // limit connections from the same IP address. If 0 infinite
  storage: 'memory', // socket storage type
  subprotocol: 'jsonRWS', // protocol used in the server
  tightening: 400, // delays in the code execution
  autodelayFactor: 500, // factor for preventing DDoS, it can lead to slower message sending when set to higher values
  version: 13, // websocket version
  debug: false // debug incoming and outgoing messages
};
const wsServer = new WsServer(wsOpts);
wsServer.socketStorage.init(null);
wsServer.bootup(httpServer);
```


## Website
[http://libs.mikosoft.info/websocket/ws-server](http://libs.mikosoft.info/websocket/ws-server)




**Server Development**
```bash
## start the test server
$ node examples/001internal.js
```


## TCPDUMP
Use *tcpdump* command to debug the messages sent from the server to the client.
For example ```sudo tcpdump -i any port 8000 -X -s0``` where 8000 is the server port.


### Licence
Copyright (c) 2021- Mikosoft licensed under [MIT](../LICENSE) .

