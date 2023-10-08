const { EventEmitter } = require('events');
const { subprotocol, websocket13, helper } = require('@mikosoft/ws-lib');
const DataParser13 = websocket13.DataParser;
const storage = require('../storage');



/**
 * Data transfer according to RFC6455 ( https://tools.ietf.org/html/rfc6455#section-5 )
 */
class DataTransfer {

  /**
   * @param {object} wsOpts - RWS options
   */
  constructor(wsOpts) {
    this.wsOpts = wsOpts;
    this.socketStorage = storage(wsOpts);
    this.subprotocolLib = subprotocol(wsOpts);
    if (wsOpts.version = 13) { this.dataParser = new DataParser13(wsOpts.debug); }
    this.eventEmitter = new EventEmitter(); // event emitter (events: 'connection', 'message', 'route' )
  }



  /******** DATA INPUT  ********/
  /*****************************/
  /**
   * Carry in the client message in the server.
   * Message is converted from buffer to string. After that the message is pushed in the "message" event.
   * @param {Socket} socket - client which sends message (net socket https://nodejs.org/api/net.html#net_class_net_socket)
   * @returns {void}
   */
  carryIn(socket) {
    let msgBUFarr = [];

    socket.on('data', msgBUFchunk => {

      try {
        // console.log('msgBUFchunk::', msgBUFchunk.length, msgBUFchunk.toString('hex').match(/../g).join(' '));
        msgBUFarr.push(msgBUFchunk);
        let msgBUF = Buffer.concat(msgBUFarr);
        let msgSTR = this.dataParser.incoming(msgBUF); // convert incoming buffer message to string

        let msg;
        if (msgSTR.indexOf('OPCODE 0x') === -1) {
          /**
           * Test if the message contains the delimiter.
           * Delimiter is important because the network is splitting large message in the chunks of data so we need to know when the message reached the end and new message is starting.
           * A TCP network chunk is around 1500 bytes. To check it use linux command: $ ifconfig | grep -i MTU
           * Related terms are TCP MTU (Maximum Transmission Unit) and TCP MSS (Maximum Segment Size) --> (MSS = MTU - TCPHdrLen - IPHdrLen)
           */
          if (msgSTR.indexOf(this.subprotocolLib.delimiter) === -1) { return; }
          msg = this.subprotocolLib.incoming(msgSTR); // convert the string message to format defined by the subprotocol
          this.subprotocolLib.processing(msg, socket, this, this.socketStorage, this.eventEmitter); // process message internally
          this.eventEmitter.emit('message', msg, msgSTR, msgBUF, socket); // emit the message which can be caught by rws.on('message', ...)
        } else {
          this.opcodes(msgSTR, socket);
        }

        // reset
        msgBUFarr = [];
        msgBUF = undefined;
        msgSTR = '';
        msg = null;

      } catch (err) {
        const socketID = !!socket && !!socket.extension ? socket.extension.id : '';
        console.log(`DataTransfer.carryIn:: socketID: ${socketID}, WARNING: ${err.message}`.cliBoja('yellow'));
        console.log(err.stack.cliBoja('red'));
        this.eventEmitter.emit('message-error', err);
        // this.sendError(err, socket); // return error message back to the client
        // await new Promise(resolve => setTimeout(resolve, 800));
        // socket.destroy(); // disconnect client which sent bad message
      }
    });

  }


  /**
   * Parse websocket operation codes according to https://tools.ietf.org/html/rfc6455#section-5.1
   * @param {string} msgSTR - received message
   * @param {Socket} socket
   */
  opcodes(msgSTR, socket) {
    if (msgSTR === 'OPCODE 0x8 CLOSE') {
      this.wsOpts.showInfo && console.log('Opcode 0x8: Client closed the websocket connection'.cliBoja('yellow'));
      socket.extension.removeSocket();
    } else if (msgSTR === 'OPCODE 0x9 PING') {
      this.wsOpts.debug && console.log('Opcode 0x9: PING received'.cliBoja('yellow'));
      const pongBUF = this.dataParser.ctrlPong();
      socket.write(pongBUF);
    } else if (msgSTR === 'OPCODE 0xA PONG') {
      this.wsOpts.debug && console.log('Opcode 0xA: PONG received'.cliBoja('yellow'));
    }
  }




  /******** DATA OUTPUT  ********/
  /******************************/
  /**
   * Carry out socket message from the server to the client.
   * The message is converted from string into the buffer and then sent to the client.
   * @param {any} msg - message which will be sent to the client
   * @param {Socket} socket - client which is receiving message (net socket https://nodejs.org/api/net.html#net_class_net_socket)
   * @returns {void}
   */
  async carryOut(msg, socket) {
    const msgSTR = this.subprotocolLib.outgoing(msg); // convert outgoing message to string
    const msgBUF = this.dataParser.outgoing(msgSTR, 0); // convert string to buffer
    await this.socketWrite(msgBUF, msgSTR, socket);
  }


  /**
   * Check if socket is writable and not closed (https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState)
   * and send message in buffer format.
   * @param {Buffer} msgBUF - message to server
   */
  async socketWrite(msgBUF, msgSTR, socket) {
    // DDoS protection (protect from sending too many messages in short period time). Measure event loop time and define automaticaly regulated delay
    const autodelay = await new Promise((resolve, reject) => {
      let ms = 0;
      const startTime = process.hrtime(); // time when event loop tick strted
      process.nextTick(() => { // or setImmediate instead of process.nextTick
        const diff = process.hrtime(startTime); // the difference between time when event loop tick started and ended
        const ns = diff[0] * 1e9 + diff[1]; // nanoseconds
        ms = ns / 1000000; // miliseconds
        resolve(ms * this.wsOpts.autodelayFactor); // normal operating event loop
      });
    });
    await new Promise(r => setTimeout(r, autodelay));
    // console.log(`autodelay: ${autodelay}`.cliBoja('yellow'));

    if (!!socket && socket.writable) { socket.write(msgBUF); }
    else {
      const socketID = !!socket && !!socket.extension ? socket.extension.id : 'BADid';
      const warnMsg = `Socket "${socketID}" is not defined or not writable ! msg: ${msgSTR}`;
      console.log(warnMsg.cliBoja('yellow'));
      this.eventEmitter.emit('message-error', new Error(warnMsg));
    }
  }


  /**
   * Send message to one client (socket).
   * @param {any} msg - message which will be sent to the client
   * @param {Socket} socket
   * @returns {void}
   */
  async sendOne(msg, socket) {
    await this.carryOut(msg, socket);
  }


  /**
   * Send message to one or more clients (sockets).
   * @param {any} msg - message which will be sent to the client(s)
   * @param {Socket[]} sockets
   * @returns {void}
   */
  async send(msg, sockets) {
    for (const socket of sockets) {
      await this.carryOut(msg, socket);
    }
  }


  /**
   * Send message to all clients excluding the client who sent the message.
   * @param {any} msg - message which will be sent to the clients
   * @param {Socket} socketSender - socket which sends message
   * @returns {void}
   */
  async broadcast(msg, socketSender) {
    const iD = socketSender.extension.id;
    const sockets = await this.socketStorage.find({ id: { $ne: iD } });
    for (const socket of sockets) {
      await this.carryOut(msg, socket);
    }
  }


  /**
   * Send message to all clients including the client who sent the message.
   * @param {any} msg - message which will be sent to the clients
   * @returns {void}
   */
  async sendAll(msg) {
    const sockets = await this.socketStorage.getAll();
    for (const socket of sockets) {
      await this.carryOut(msg, socket);
    }
  }


  /**
   * Server is catching the message and not re-sending it to any of the clients.
   * @param {any} msg - message which will be sent to the client
   * @returns {any}
   */
  async catchMessage(msg) {
    return msg;
  }


  /**
   * Send message to all clients in the specific room excluding the client who sent the message.
   * @param {any} msg - message which will be sent to the room clients
   * @param {Socket} socketSender - client which is sending message (net socket https://nodejs.org/api/net.html#net_class_net_socket)
   * @param {string} roomName - a room name (group of clients)
   * @returns {void}
   */
  async sendRoom(msg, socketSender, roomName) {
    const socketSenderID = socketSender.extension.id; // sender socket id
    const room = await this.socketStorage.roomFindOne(roomName); // {name:string, socketIds:number[]}
    if (!!room) {
      const sockets = await this.socketStorage.find({ id: { $in: room.socketIds } });
      for (const socket of sockets) {
        if (!!socket && socket.extension.id !== socketSenderID) { await this.carryOut(msg, socket); }
      }
    }
  }



  /**
   * Send error message to one client (socket).
   * @param {Error} err - error which will be sent to the client
   * @param {Socket} socket - client which is receiving message (net socket https://nodejs.org/api/net.html#net_class_net_socket)
   * @returns {void}
   */
  async sendError(err, socket) {
    const to = !!socket.extension ? socket.extension.id : 0;
    const msgObj = {
      id: helper.generateID(),
      from: 0,
      to,
      cmd: 'server-error',
      payload: err.message
    };
    await this.carryOut(msgObj, socket);
  }


  /**
   * Send socket ID back to the client.
   * @param {Error} err - error which will be sent to the client
   * @param {Socket} socket - client which is receiving message (net socket https://nodejs.org/api/net.html#net_class_net_socket)
   * @returns {void}
   */
  async sendID(socket) {
    const msgObj = {
      id: helper.generateID(),
      from: 0,
      to: socket.extension.id,
      cmd: 'info/socket/id',
      payload: socket.extension.id
    };
    await this.carryOut(msgObj, socket);
  }




}


module.exports = DataTransfer;
