const { helper } = require('@mikosoft/ws-lib');


/**
 * Define extended properties and methods on the existing socket (https://nodejs.org/api/net.html#net_class_net_socket) -> "socket.extension" object
 * Extra functionalities like: listen for the socket events, manage socket authentication, reconfiguration ...etc.
 */
class SocketExtension {

  /**
   * @param {Socket} socket - net socket https://nodejs.org/api/net.html#net_class_net_socket
   * @param {object} wsOpts - websocket options {timeout, max_connection}
   * @param {object} socketStorage - socketStorage from /storage/ folder
   * @param {object} dataTransfer - DataTransfer.js instance
   * @param {string} url - /something?authkey=TRTmrt
   * @param {string} userAgent - Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36
   * @param {string} origin - 'Origin' request header
   * @param {string} ip - external socket IP address - 58.123.33.22
   */
  constructor(socket, wsOpts, socketStorage, dataTransfer, url, userAgent, origin, ip, port) {
    this.socket = socket;
    this.wsOpts = wsOpts;
    this.socketStorage = socketStorage;
    this.dataTransfer = dataTransfer;
    this.url = url;
    this.userAgent = userAgent;
    this.origin = origin;
    this.ip = ip;
    this.port = port;

    this.extension(); // add "extension" property
    this.changeTimeout(); // change socket timeout
    this.events(); // listen for the socket events
  }



  /**
   * Extend original socket object described at https://nodejs.org/api/net.html#net_class_net_socket with the "extension" property.
   * For example {id: 201108152256800910, ip: '::ffff:192.168.1.112', port: 60138, time: '2017-06-22T11:10:15.375Z', ...}
   */
  extension() {
    this.socket.extension = {};

    // handle URL query string
    this.socket.extension.urlQuery = {}; // {authkey: 'TRTmrt', socketID: '210729152147533020'}
    const urlObj = new URL('http://localhost' + this.url);
    for (const key of urlObj.searchParams.keys()) {
      this.socket.extension.urlQuery[key] = urlObj.searchParams.get(key);
    }

    // properties
    // this.socket.extension.id = helper.generateID(); // 20201129131151783230
    this.socket.extension.id = this.socket.extension.urlQuery.socketID; // 20201129131151783230
    this.socket.extension.nick = ''; // custom nick name
    this.socket.extension.ip = this.ip; // client IP
    this.socket.extension.port = +this.socket.remotePort; // client port
    this.socket.extension.time = (new Date()).toISOString(); // 2020-11-15T14:41:48.479Z    (GMT - Greenwich Meridian Time)
    this.socket.extension.wsOpts = this.wsOpts; // {timeout, maxConns, maxIPconns, ...}
    this.socket.extension.userAgent = this.userAgent; // Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36
    this.socket.extension.authenticated = false; // is the web socket authenticated
    this.socket.extension.url = this.url; // /something?authkey=TRTmrt
    this.socket.extension.origin = this.origin;


    // methods
    this.socket.extension.changeTimeout = this.changeTimeout.bind(this);
    this.socket.extension.authenticate = this.authenticate.bind(this);

    this.socket.extension.addSocket = this.socketStorage.add.bind(this.socketStorage, this.socket);
    this.socket.extension.removeSocket = this.socketStorage.remove.bind(this.socketStorage, this.socket);
    this.socket.extension.exitAllRooms = this.socketStorage.roomExitAll.bind(this.socketStorage, this.socket.extension.id);

    this.socket.extension.sendSelf = (msg) => { this.dataTransfer.sendOne(msg, this.socket); };
  }



  /**
   * Listen for the socket events.
   * https://nodejs.org/api/net.html
   */
  events() {
    this.socket.on('storage-add', async () => {
      const now = helper.nowTime();
      const count = await this.socketStorage.count();
      const txt = `${now} (${count}) Websocket connected ID: ${this.socket.extension.id} ip:port: ${this.socket.extension.ip}:${this.socket.extension.port} timeout: ${this.socket.timeout / 1000}s`.cliBoja('magenta');
      this.wsOpts.showInfo && console.log(txt);
    });

    this.socket.on('close', async () => {
      this.socket.extension.removeSocket(); // remove the socket from the system
      const now = helper.nowTime();
      const count = await this.socketStorage.count();
      const txt = `${now} (${count}) Websocket closed! ID: ${this.socket.extension.id}.`.cliBoja('magenta');
      this.wsOpts.showInfo && console.log(txt);
    });

    this.socket.on('timeout', async () => {
      this.socket.extension.removeSocket();
      const now = helper.nowTime();
      const count = await this.socketStorage.count();
      const txt = `${now} (${count}) Websocket timeout after ${this.socket.timeout / 1000}s of inactivity! ID: ${this.socket.extension.id}.`.cliBoja('magenta');
      this.wsOpts.showInfo && console.log(txt);
    });

    this.socket.on('error', async (err) => {
      this.socket.extension.removeSocket();
      const now = helper.nowTime();
      const count = await this.socketStorage.count();
      const txt = `${now} (${count}) Websocket error! ID: ${this.socket.extension.id}.`.cliBoja('red');
      this.wsOpts.showInfo && console.log(txt);
      console.log(err.stack.cliBoja('red'));
    });

  }



  /**
   * Change the socket timeout. Timeout is the time of inactivity after which the socket will be closed.
   */
  changeTimeout() {
    this.socket.setTimeout(this.wsOpts.timeout); // close socket after ms of inactivity
  }



  /**
   * Authenticate a websocket. Do not allow a client (socket) connection if the authentication failed.
   * Compares authkey from the URL query with the authkey in the function argument and set "socket.extension.authenticated" to true or false.
   * @param {string} authkey - authkey which needs to be same with the authkey in the URL
   * @returns {void}
   */
  authenticate(authkey) {
    const authkey_url = this.socket.extension.urlQuery.authkey; // authkey received from the URL query: ws://localhost:3211/something?authkey=12345

    if (!!authkey && authkey !== authkey_url) {
      this.socket.extension.authenticated = false;
      // this.socket.emit('close'); // close the socket
      this.wsOpts.showInfo && console.log(`Bad WS Authentication with authkey: ${authkey_url}`.cliBoja('magenta', 'bright'));
    } else if (!!authkey && authkey === authkey_url) {
      this.socket.extension.authenticated = true;
      this.wsOpts.showInfo && console.log(`Good WS Authentication with authkey: ${authkey_url}`.cliBoja('magenta', 'bright'));
    } else {
      this.socket.extension.authenticated = 'anonymous';
      this.wsOpts.showInfo && console.log(`Anonymous WS Authentication`.cliBoja('magenta', 'bright'));
    }

    if (!this.socket.extension.authenticated) {
      const err = new Error(`Socket is not authenticated! Client IP: ${this.socket.extension.ip} , userAgent: ${this.socket.extension.userAgent}`);
      this.dataTransfer.sendError(err, this.socket);
      setTimeout(() => { this.socket.destroy(); }, 100);
    }

  }




}




module.exports = SocketExtension;
