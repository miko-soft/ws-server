/**
 * An example with the built-in HTTP server.
 */
const { WsServer, WsHttpServer } = require('../index.js');

const Router = require('@mikosoft/router');
const router = new Router({ debug: false });


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



// websocket ultra
const wsOpts = {
  timeout: 5 * 60 * 1000,
  maxConns: 20,
  maxIPConns: 10,
  storage: 'memory',
  subprotocol: 'jsonRWS',
  tightening: 100,
  autodelayFactor: 500,
  version: 13,
  debug: false
};
const wsServer = new WsServer(wsOpts);
wsServer.socketStorage.init(null);
wsServer.bootup(httpServer);





/*** socket stream ***/
wsServer.on('connection', async socket => {
  /* send message back to the client */
  const msgWelcome = 'New connection from socketID ' + socket.extension.id;
  // socket.extension.sendSelf({id: helper.generateID(), from: 0, cmd: 'info', payload: msgWelcome});

  // wsServer.dataTransfer.send(msgWelcome, socket);

  /* authenticate the socket */
  const authkey = 'TRTmrt'; // can be fetched from the database, usually 'users' table
  socket.extension.authenticate(authkey); // authenticate the socket: compare authkey with the sent authkey in the client request URL ws://localhost:3211/something?authkey=TRTmrt


  /* socketStorage test */
  // await new Promise(resolve => setTimeout(resolve, 5500));
  // const socketFound = wsServer.socketStorage.findOne({ip: '::1'});
  // if (!!socketFound && socketFound.extension) console.log('found socket.extension::', socketFound.extension);

});





/*** all messages stream ***/
wsServer.on('message', msg => {
  console.log('\nmessageStream::', msg);
  // console.log('on message::', msg.payload);
});




/*** route stream ***/
wsServer.on('route', (msgObj, socket, dataTransfer, socketStorage, eventEmitter) => { // msgObj:: {id, from, to, cmd, payload: {uri, body}}
  console.log('routeStream::', msgObj);
  const payload = msgObj.payload;

  // router transitional variable
  router.trx = {
    uri: payload.uri,
    body: payload.body,
    msgObj,
    socket,
    dataTransfer: wsServer.dataTransfer
  };


  // route definitions
  router.def('/shop/login', (trx) => { console.log('trx::', trx.uri); });
  router.def('/shop/product/:id', (trx) => { console.log('trx::', trx.uri); });
  router.def('/send/me/back', (trx) => {
    const id = trx.msgObj.id;
    const from = 0;
    const to = trx.msgObj.from;
    const cmd = 'route';
    const payload = { uri: '/returned/back/21', body: { x: 'something', y: 28 } };
    const msg = { id, from, to, cmd, payload };
    wsServer.dataTransfer.sendOne(msg, trx.socket);
  }); // send new route back to the client
  router.notfound((trx) => { console.log(`The URI not found: ${trx.uri}`); });

  // execute the router
  router.exe().catch(err => {
    console.log(err);
    wsServer.dataTransfer.sendOne({ cmd: 'error', payload: err.stack }, socket);
  });

});
