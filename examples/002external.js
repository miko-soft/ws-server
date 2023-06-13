/**
 * An example with the external HTTP server injected into the .
 */
const http = require('http');
const { RWServer } = require('../index.js');


// create external HTTP server instance
const httpServer = http.createServer((req, res) => {
  res.end('Welcome to WebSocket Ultra !');
});
httpServer.listen(3211);
httpServer.on('listening', () => {
  const addr = httpServer.address();
  const ip = addr.address === '::' ? '127.0.0.1' : addr.address;
  const port = addr.port;
  console.log(`HTTP Server is listening on ${ip}:${port}`);
});
httpServer.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = (typeof this.port === 'string')
    ? 'Pipe ' + this.port
    : 'Port ' + this.port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      console.error(error);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});


// init the websocket server
const wsOpts = {
  timeout: 5 * 60 * 1000,
  maxConns: 5,
  maxIPConns: 3,
  storage: 'memory',
  subprotocol: 'jsonRWS',
  tightening: 100,
  autodelayFactor: 500,
  version: 13,
  debug: false
};
const rws = new RWServer(wsOpts);
rws.socketStorage.init(null);
rws.bootup(httpServer);


/*** socket stream ***/
rws.on('connection', async socket => {
  /* authenticate the socket */
  const authkey = 'TRTmrt'; // can be fetched from the database, usually 'users' table
  socket.extension.authenticate(authkey); // authenticate the socket: compare authkey with the sent authkey in the client request URL ws://localhost:3211/something?authkey=TRTmrt
});
