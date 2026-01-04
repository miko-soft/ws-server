const Server = require('http').Server;
const { websocket13, helper, StringExt } = require('@mikosoft/ws-lib');
const storage = require('./storage');
const SocketExtension = require('./auxillary/SocketExtension');
const DataTransfer = require('./auxillary/DataTransfer');

new StringExt();



class WsServer {

  /**
   * @param {object} wsOpts - websocket options
   */
  constructor(wsOpts) {

    // define default websocket options for the WS Server
    if (!wsOpts) {
      wsOpts = {
        timeout: 5 * 60 * 1000, // close socket after ms inactivity. If 0 never close. Default: 5min.
        allowHalfOpen: false, // if false close socket if it's readyState is writeOnly or readOnly. When NginX timeout socket on the client side [Client -X- NginX --- WSServer(NodeJS)]
        maxConns: 10000, // limit connections to the server
        maxIPConns: 3, // limit connections from the same IP address. If 0 infinite
        storage: 'memory', // socket storage type
        subprotocol: 'jsonRWS', // protocol used in the server
        tightening: 400, // delays in the code execution
        autodelayFactor: 500, // factor for preventing DDoS, it can lead to slower message sending when set to higher values
        version: 13, // websocket version
        debug: false, // debug incoming and outgoing messages
        showInfo: true // show info messages
      };
    } else {
      if (!wsOpts.timeout) { wsOpts.timeout = 5 * 60 * 1000; }
      if (!wsOpts.allowHalfOpen) { wsOpts.allowHalfOpen = false; }
      if (wsOpts.maxIPConns === undefined) { wsOpts.maxIPConns = 3; } // default 3, 0 means infinite
      if (wsOpts.maxIPConns > 0 && wsOpts.maxConns < wsOpts.maxIPConns) { throw new Error('Option "maxConns" must be greater then "maxIPConns".'); }
      if (wsOpts.maxConns <= 0) { throw new Error('Option "maxConns" must be greater then 0.'); }
      if (!wsOpts.storage) { throw new Error('Option "storage" is not defined. ("storage": "memory")'); }
      if (!wsOpts.subprotocol) { throw new Error('Option "subprotocol" is not defined. ("subprotocol": "jsonRWS")'); }
      if (wsOpts.tightening !== 0 && !wsOpts.tightening) { wsOpts.tightening = 400; }
      if (wsOpts.autodelayFactor !== 0 && !wsOpts.autodelayFactor) { wsOpts.autodelayFactor = 500; }
      if (!wsOpts.version) { wsOpts.version = 13; }
    }
    this.wsOpts = wsOpts;

    this.server; // HTTP server

    // RWS properties
    this.dataTransfer = new DataTransfer(wsOpts);
    this.socketStorage = storage(wsOpts);

  }




  /**
   * Initialise the websocket server
   * @param {Server} httpServer - NodeJS HTTP server instance https://nodejs.org/api/http.html#http_class_http_server
   */
  bootup(httpServer) {
    if (!(httpServer instanceof Server)) { throw new Error('No HTTP server instance.'); }
    this.server = httpServer;
    this.onUpgrade();
    this.onRequest();
    this.wsOpts.showInfo && console.log('Websocket Server booted up'.cliBoja('blue', 'bright'));
    this.wsOpts.showInfo && console.log(`- storage: ${this.wsOpts.storage}`.cliBoja('blue'));
    this.wsOpts.showInfo && console.log(`- subprotocol: ${this.wsOpts.subprotocol}`.cliBoja('blue'));
    this.wsOpts.showInfo && console.log(`- timeout (inactivity): ${this.wsOpts.timeout} ms`.cliBoja('blue'));
  }



  /**
   * On 'upgrade' event i.e. when header "Upgrade: websocket" is sent from the client.
   * This is the client connection event.
   * Notice: 'req.socket' is same as 'socket'
   */
  onUpgrade() {
    this.server.on('upgrade', async (req, socket) => {
      // console.log('isSame:::', req.socket === socket); // true

      // if allowHalfOpen=false close the socket when readyState becomes writeOnly or readOnly ("close" event will be emitted and socket will be removed from socketStorage -> socketExtension.js)
      socket.allowHalfOpen = this.wsOpts.allowHalfOpen;

      /*** input data ***/
      const socketStorage = this.socketStorage;
      const dataTransfer = this.dataTransfer;
      const url = req.url; // /something?username=majk in ws://localhost:3211/something?username=majk

      // const ip = socket.remoteAddress; // ::ffff:127.0.0.1
      const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || socket.remoteAddress.replace('::ffff:', ''); // 58.123.33.22 -- nginx -> proxy_set_header  X-Real-IP $remote_addr;
      const port = req.headers['x-real-port'] || req.socket.remotePort; // 34080 -- nginx --> proxy_set_header  X-Real-Port $remote_port
      const origin = req.headers['origin'];
      const upgrade = req.headers['upgrade']; // websocket
      const wsKey = req.headers['sec-websocket-key']; // 7PcnXRWw6+pnRVpPDG3IzA==
      const wsVersion = +req.headers['sec-websocket-version']; // 13
      const wsProtocols = req.headers['sec-websocket-protocol']; // raw,jsonRWS -> subprotocols sent by the client (new WebSocket(wsURL, subprotocols))
      const wsExtension = req.headers['sec-websocket-extension']; // permessage-deflate; client_max_window_bits
      const userAgent = req.headers['user-agent']; // Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36

      const wsOpts = this.wsOpts || {};
      const version = wsOpts.version;
      const subprotocol = wsOpts.subprotocol;
      const tightening = wsOpts.tightening;


      try {
        /********* PRECHECKS *********/
        if (upgrade !== 'websocket') { throw new Error('HTTP/1.1 400 Bad Request. The "Upgrade: websocket" HTTP header is not sent from the client.'); }
        if (!wsKey) { throw new Error('Client didn\'t send "Sec-Websocket-Key" header.'); }
        if (wsVersion !== version) { throw new Error(`Websocket version ${wsVersion} is not supported. Valid version: ${version}.`); }
        if (!!wsProtocols && !wsProtocols.includes(subprotocol)) { throw new Error(`Client requested "${wsProtocols}" subprotocols but server supports "${subprotocol}".`); }


        /********** SOCKET EXTENSION ***********/
        new SocketExtension(socket, wsOpts, socketStorage, dataTransfer, url, userAgent, origin, ip, port); // creates property socket.extension
        await helper.sleep(tightening);


        /********** HANDSHAKE ***********/
        if (version === 13) { websocket13.handshake.forServer(socket, wsKey, wsVersion, wsProtocols, subprotocol); }
        await helper.sleep(tightening);


        /********** SOCKETS ***********/
        socket.extension.addSocket(); // add socket in the storage (memory, file, mongodb, redis)
        dataTransfer.eventEmitter.emit('connection', socket); // push the socket into the eventEmitter
        await helper.sleep(tightening);

        /******* LIMIT NUMBER OF CLIENT CONNECTIONS *********/
        await this.limitConnections(socketStorage, ip);
        await helper.sleep(tightening);

        /********** DATA TRANSFER ***********/
        dataTransfer.carryIn(socket);


      } catch (err) {
        console.log(err.stack.cliBoja('red'));
        if (!!socket) {
          this.dataTransfer.sendError(err, socket);
          setTimeout(() => { socket.destroy(); }, 3400);
        }
      }

    });

  }


  /**
   * On every HTTP request except where header is 'Connection': 'Upgrade'
   */
  onRequest() {
    this.server.on('request', (req, res) => {
      // console.log('url::', req.url.cliBoja('yellow', 'italic'));
      // console.log('headers::', JSON.stringify(req.headers, null, 2).cliBoja('yellow', 'italic'));
      // res.writeHead(200, { 'Content-Type': 'text/json'});
      // res.write({success: false, msg: 'Bad request!'});
      // res.end();
    });
  }




  /**
   * 1. Limit total number of client connections on the server
   * 2. Limit the number of connections from the same client IP address
   * @param {SocketStorage} socketStorage - socketStorage instance
   * @param {string} ip - the client IP address
   */
  async limitConnections(socketStorage, ip) {
    const conns = await socketStorage.count(); // total number of sockets

    const foundSocketsByIP = await socketStorage.find({ ip });
    const ip_conns = foundSocketsByIP.length; // number of connections from an IP

    // limit total number of connections
    if (conns > this.wsOpts.maxConns) { throw new Error(`Total connections: ${conns}  Max allowed: ${this.wsOpts.maxConns}`); }

    // limit number of connection from the same IP (if maxIPConns is 0, it means infinite, so skip the check)
    if (this.wsOpts.maxIPConns > 0 && ip_conns > this.wsOpts.maxIPConns) { throw new Error(`Total connections from IP ${ip} is ${ip_conns}.  Max allowed: ${this.wsOpts.maxIPConns}`); }
  }



  /*** Event Listeners ***/
  /**
   * Wrapper around the eventEmitter
   * @param {string} eventName - event name: 'connection', 'message', 'message-error', 'route'
   * @param {Function} listener - callback function
   */
  on(eventName, listener) {
    return this.dataTransfer.eventEmitter.on(eventName, listener);
  }

  /**
   * Listen the event only one time.
   * @param {string} eventName - event name: 'connection', 'message', 'message-error', 'route'
   * @param {Function} listener - callback function
   */
  once(eventName, listener) {
    return this.dataTransfer.eventEmitter.once(eventName, listener);
  }

  /**
   * Stop listening the event.
   * @param {string} eventName - event name: 'connection', 'message', 'message-error', 'route'
   * @param {Function} listener - callback function
   */
  off(eventName, listener) {
    return this.dataTransfer.eventEmitter.off(eventName, listener);
  }




}




module.exports = WsServer;
