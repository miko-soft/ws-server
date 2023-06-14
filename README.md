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


## Website
[http://libs.mikosoft.info/ws-server](http://libs.mikosoft.info/ws-server)




**Server Development**
```bash
## start the test server
$ nodemon examples/001internal.js
```


## TCPDUMP
Use *tcpdump* command to debug the messages sent from the server to the client.
For example ```sudo tcpdump -i any port 8000 -X -s0``` where 8000 is the server port.


### Licence
Copyright (c) 2021- Mikosoft licensed under [MIT](../LICENSE) .

