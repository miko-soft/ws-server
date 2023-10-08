const http = require('http');


/**
 * Internal HTTP Server which will run in case that external is not injected.
 * - port:number - HTTP Server port number
 * - timeout:number - ms of inactivity after ws will be closed. If 0 then the ws will never close. Default is 5 minutes.
 * - showInfo:boolean
 */
class WsHttpServer {

  constructor(httpOpts) {

    // HTTP server options
    if (!!httpOpts) {
      this.httpOpts = httpOpts;
      if (!this.httpOpts.port) { throw new Error('The server port is not defined'); }
      else if (!this.httpOpts.timeout) { this.httpOpts.timeout = 5 * 60 * 1000; }
    } else {
      this.httpOpts = {
        port: 3000,
        timeout: 5 * 60 * 1000, // 5 minutes is the default
        showInfo: false
      };
    }

    this.httpServer;
  }


  /*** HTTP SERVER COMMANDS ***/
  /**
   * Start the HTTP Server
   * @returns {Server} - nodeJS HTTP server instance https://nodejs.org/api/http.html#http_class_http_server
   */
  start() {
    // start HTTP Server
    this.httpServer = http.createServer((req, res) => {
      // CORS HEADERS
      res.setHeader('Content-Type', 'text/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, HEAD');
      res.setHeader('Access-Control-Max-Age', 3600);

      // send response
      res.end('Welcome to websocket\'s HTTP Server  !\n');
    });

    // configure HTTP Server
    this.httpServer.listen(this.httpOpts.port);
    this.httpServer.timeout = this.httpOpts.timeout;

    // listen for server events
    this.events();

    return this.httpServer;
  }


  /**
   * Stop the HTTP Server
   */
  async stop() {
    await new Promise(resolve => setTimeout(resolve, 2100));
    this.httpServer.close();
  }


  /**
   * Restart the HTTP Server
   */
  async restart() {
    this.stop();
    await new Promise(resolve => setTimeout(resolve, 2100));
    this.start();
  }




  /*** HTTP SERVER EVENTS ***/
  events() {
    this._onListening();
    this._onClose();
    this._onError();
  }


  _onListening() {
    this.httpServer.on('listening', () => {
      const addr = this.httpServer.address();
      const ip = addr.address === '::' ? '127.0.0.1' : addr.address;
      const port = addr.port;
      this.httpOpts.showInfo && console.log(`HTTP Server is started on ${ip}:${port}`.cliBoja('blue', 'bright'));
    });
  }


  _onClose() {
    this.httpServer.on('close', () => {
      this.httpOpts.showInfo && console.log(`HTTP Server is stopped.`.cliBoja('blue', 'bright'));
    });
  }


  _onError() {
    this.httpServer.on('error', error => {
      if (error.syscall !== 'listen') { throw error; }

      if (error.code === 'EACCES') {
        console.log('EACCES: Port requires elevated privileges'.cliBoja('red', 'italic'));
        process.exit(1);
      } else if (error.code === 'EADDRINUSE') {
        console.log('EADDRINUSE: Port is already in use'.cliBoja('red', 'italic'));
        process.exit(1);
      }

    });
  }



}



module.exports = WsHttpServer;
