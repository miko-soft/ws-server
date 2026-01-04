# @mikosoft/ws-server - Complete API Documentation

> Ultra fast Websocket Server with builtin JS framework for creating real-time, complex apps.

Complete API reference documentation for the @mikosoft/ws-server library, including all classes, methods, and usage examples.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [WsServer Class](#wsserver-class)
- [WsHttpServer Class](#wshttpserver-class)
- [SocketStorage Methods](#socketstorage-methods)
- [DataTransfer Methods](#datatransfer-methods)
- [Socket Extension API](#socket-extension-api)
- [Events](#events)
- [Configuration Options](#configuration-options)

---

## Installation

```bash
npm install --save @mikosoft/ws-server
```

---

## Quick Start

```js
const { WsServer, WsHttpServer } = require('@mikosoft/ws-server');

// Create and start HTTP server
const httpOpts = {
  port: 3211,
  timeout: 0 // 0 means never timeout
};
const wsHttpServer = new WsHttpServer(httpOpts);
const httpServer = wsHttpServer.start();

// Configure WebSocket server
const wsOpts = {
  timeout: 5 * 60 * 1000, // 5 minutes inactivity timeout
  maxConns: 10000, // Maximum total connections
  maxIPConns: 3, // Maximum connections per IP (0 = unlimited)
  storage: 'memory',
  subprotocol: 'jsonRWS',
  version: 13,
  debug: false
};

const wsServer = new WsServer(wsOpts);
wsServer.socketStorage.init(null);
wsServer.bootup(httpServer);

// Listen for connections
wsServer.on('connection', async (socket) => {
  console.log('New connection:', socket.extension.id);

  // Replace 'your-auth-key' with your actual authentication key.
  // The authkey is typically sent by the client as a query parameter, e.g. ws://localhost:3211/path?authkey=MY_KEY
  socket.extension.authenticate('your-auth-key'); // <-- place your server-side valid authkey here
});
```

---

## WsServer Class

The main WebSocket server class that handles all WebSocket operations.

### Constructor

```js
new WsServer(wsOpts)
```

**Parameters:**
- `wsOpts` (Object, optional) - Configuration options (see [Configuration Options](#configuration-options))

**Returns:** `WsServer` instance

**Example:**
```js
const wsServer = new WsServer({
  timeout: 5 * 60 * 1000,
  maxConns: 10000,
  storage: 'memory',
  subprotocol: 'jsonRWS'
});
```

---

### Methods

#### `bootup(httpServer)`

Initializes the WebSocket server and attaches it to an HTTP server instance.

**Parameters:**
- `httpServer` (Server) - Node.js HTTP server instance

**Throws:** Error if httpServer is not a valid HTTP server instance

**Example:**
```js
const httpServer = http.createServer();
wsServer.bootup(httpServer);
```

---

#### `on(eventName, listener)`

Registers an event listener for WebSocket events. This is a wrapper around EventEmitter's `on` method.

**Parameters:**
- `eventName` (String) - Event name: `'connection'`, `'message'`, `'message-error'`, or `'route'`
- `listener` (Function) - Callback function

**Returns:** EventEmitter (for chaining)

**Available Events:**
- `connection` - Emitted when a new client connects. Callback receives `(socket)`
- `message` - Emitted when a message is received. Callback receives `(msg)`
- `message-error` - Emitted when message parsing fails. Callback receives `(error)`
- `route` - Emitted for routed messages. Callback receives `(msgObj, socket, dataTransfer, socketStorage, eventEmitter)`

**Example:**
```js
wsServer.on('connection', (socket) => {
  console.log('Client connected:', socket.extension.id);
});

wsServer.on('message', (msg) => {
  console.log('Message received:', msg);
});
```

---

#### `once(eventName, listener)`

Registers a one-time event listener that will be called only once.

**Parameters:**
- `eventName` (String) - Event name
- `listener` (Function) - Callback function

**Returns:** EventEmitter (for chaining)

**Example:**
```js
wsServer.once('connection', (socket) => {
  console.log('First client connected!');
});
```

---

#### `off(eventName, listener)`

Removes an event listener.

**Parameters:**
- `eventName` (String) - Event name
- `listener` (Function) - The listener function to remove

**Returns:** EventEmitter (for chaining)

**Example:**
```js
const handler = (socket) => console.log('Connected');
wsServer.on('connection', handler);
// Later...
wsServer.off('connection', handler);
```

---

### Properties

#### `socketStorage`

Access to the socket storage instance for managing connected sockets. See [SocketStorage Methods](#socketstorage-methods).

**Example:**
```js
const allSockets = await wsServer.socketStorage.getAll();
const count = await wsServer.socketStorage.count();
```

---

#### `dataTransfer`

Access to the data transfer instance for sending messages. See [DataTransfer Methods](#datatransfer-methods).

**Example:**
```js
const msg = { id: 1, from: 0, to: socketId, cmd: 'info', payload: 'Hello' };
await wsServer.dataTransfer.sendOne(msg, socket);
```

---

## WsHttpServer Class

Internal HTTP server for WebSocket connections. Can be used standalone or you can provide your own HTTP server.

### Constructor

```js
new WsHttpServer(httpOpts)
```

**Parameters:**
- `httpOpts` (Object, optional) - HTTP server options
  - `port` (Number, required if httpOpts provided) - Server port number
  - `timeout` (Number, optional) - Connection timeout in milliseconds (default: 300000 = 5 minutes, 0 = never timeout)
  - `showInfo` (Boolean, optional) - Show informational messages (default: false)

**Throws:** Error if port is not defined when httpOpts is provided

**Example:**
```js
const wsHttpServer = new WsHttpServer({
  port: 3211,
  timeout: 0,
  showInfo: true
});
```

---

### Methods

#### `start()`

Starts the HTTP server and returns the Node.js HTTP server instance.

**Returns:** `Server` - Node.js HTTP server instance

**Example:**
```js
const httpServer = wsHttpServer.start();
console.log('Server started on port', wsHttpServer.httpOpts.port);
```

---

#### `stop()`

Stops the HTTP server gracefully.

**Returns:** `Promise<void>`

**Example:**
```js
await wsHttpServer.stop();
console.log('Server stopped');
```

---

#### `restart()`

Restarts the HTTP server (stops and starts again).

**Returns:** `Promise<void>`

**Example:**
```js
await wsHttpServer.restart();
```

---

## SocketStorage Methods

All socket storage methods are accessed via `wsServer.socketStorage`. These methods manage the collection of connected WebSocket clients.

---

#### `init(storageOpts)`

Initializes the socket storage.

**Parameters:**
- `storageOpts` (Object, optional) - Storage-specific options (can be null for memory storage)

**Example:**
```js
wsServer.socketStorage.init(null);
```

---

#### `count()`

Returns the total number of connected sockets.

**Returns:** `Promise<Number>`

**Example:**
```js
const totalConnections = await wsServer.socketStorage.count();
console.log('Total connections:', totalConnections);
```

---

#### `getAll()`

Returns an array of all connected sockets.

**Returns:** `Promise<Socket[]>`

**Example:**
```js
const allSockets = await wsServer.socketStorage.getAll();
console.log('Connected sockets:', allSockets.length);
```

---

#### `add(socket)`

Adds a socket to the storage. Usually called internally during connection.

**Parameters:**
- `socket` (Socket) - WebSocket socket instance

**Returns:** `Promise<void>`

---

#### `remove(socket)`

Removes a socket from storage, destroys the connection, and removes it from all rooms.

**Parameters:**
- `socket` (Socket) - WebSocket socket instance

**Returns:** `Promise<void>`

**Example:**
```js
await wsServer.socketStorage.remove(socket);
```

---

#### `removeByQuery(query)`

Removes all sockets matching the query criteria.

**Parameters:**
- `query` (Object) - Search query object (see `find()` for query syntax)

**Returns:** `Promise<Number>` - Number of sockets removed

**Example:**
```js
// Remove all sockets from a specific IP
const removed = await wsServer.socketStorage.removeByQuery({ ip: '192.168.1.100' });
console.log('Removed', removed, 'sockets');
```

---

#### `listIDs(sort)`

Returns an array of all socket IDs (useful for debugging, as socket objects can be large).

**Parameters:**
- `sort` (String, optional) - Sort order: `'asc'`, `'desc'`, or undefined (no sort)

**Returns:** `Promise<Number[]>`

**Example:**
```js
const socketIds = await wsServer.socketStorage.listIDs('asc');
console.log('Socket IDs:', socketIds);
```

---

#### `find(query)`

Finds all sockets matching the query criteria.

**Parameters:**
- `query` (Object) - Search query object

**Query Syntax:**
```js
// Simple equality
{ id: 201117092132387170 }
{ ip: '127.0.0.1' }
{ authenticated: true }

// Advanced queries
{ id: { $in: [123, 456, 789] } }  // ID in array
{ ip: { $ne: '::1' } }            // IP not equal
{ userAgent: { $regex: /chrome/i } } // Regex match
```

**Returns:** `Promise<Socket[]>`

**Example:**
```js
// Find all sockets from a specific IP
const sockets = await wsServer.socketStorage.find({ ip: '192.168.1.100' });

// Find authenticated sockets
const authSockets = await wsServer.socketStorage.find({ authenticated: true });

// Find sockets with IDs in array
const specificSockets = await wsServer.socketStorage.find({ 
  id: { $in: [123456, 789012] } 
});
```

---

#### `findOne(query)`

Finds a single socket matching the query criteria.

**Parameters:**
- `query` (Object) - Search query object (same syntax as `find()`)

**Returns:** `Promise<Socket | undefined>`

**Example:**
```js
const socket = await wsServer.socketStorage.findOne({ id: 201117092132387170 });
if (socket) {
  console.log('Found socket:', socket.extension.id);
}
```

---

#### `exists(socket)`

Checks if a socket exists in storage.

**Parameters:**
- `socket` (Socket) - WebSocket socket instance

**Returns:** `Promise<Boolean>`

**Example:**
```js
const exists = await wsServer.socketStorage.exists(socket);
console.log('Socket exists:', exists);
```

---

#### `setNick(socket, nickname)`

Sets a unique nickname for a socket. Throws an error if the nickname already exists.

**Parameters:**
- `socket` (Socket) - WebSocket socket instance
- `nickname` (String) - Unique nickname

**Returns:** `Promise<void>`

**Throws:** Error if nickname already exists

**Example:**
```js
try {
  await wsServer.socketStorage.setNick(socket, 'Player1');
  console.log('Nickname set:', socket.extension.nickname);
} catch (err) {
  console.error('Nickname already exists');
}
```

---

#### `purge(sec)`

Removes disconnected sockets (sockets with `readOnly` or `writeOnly` readyState). If `sec` is provided, it runs periodically.

**Parameters:**
- `sec` (Number, optional) - If provided, purge runs every `sec` seconds. If 0, purges once immediately.

**Returns:** `Promise<void>`

**Example:**
```js
// Purge once
await wsServer.socketStorage.purge(0);

// Purge every 60 seconds
await wsServer.socketStorage.purge(60);
```

---

### Room Methods

Rooms allow you to group sockets together for targeted messaging.

---

#### `roomEnter(socket, roomName)`

Adds a socket to a room. Creates the room if it doesn't exist.

**Parameters:**
- `socket` (Socket) - WebSocket socket instance
- `roomName` (String) - Room name

**Returns:** `void`

**Example:**
```js
wsServer.socketStorage.roomEnter(socket, 'lobby');
wsServer.socketStorage.roomEnter(socket, 'game-room-1');
```

---

#### `roomExit(socket, roomName)`

Removes a socket from a room. Removes the room if it becomes empty.

**Parameters:**
- `socket` (Socket) - WebSocket socket instance
- `roomName` (String) - Room name

**Returns:** `void`

**Example:**
```js
wsServer.socketStorage.roomExit(socket, 'lobby');
```

---

#### `roomExitAll(socketId)`

Removes a socket from all rooms.

**Parameters:**
- `socketId` (Number) - Socket ID

**Returns:** `void`

**Example:**
```js
wsServer.socketStorage.roomExitAll(socket.extension.id);
```

---

#### `roomList()`

Returns a list of all rooms.

**Returns:** `Promise<Array>` - Array of room objects `{name: String, socketIds: Number[]}`

**Example:**
```js
const rooms = await wsServer.socketStorage.roomList();
console.log('Rooms:', rooms);
// Output: [{name: "lobby", socketIds: [123, 456]}, {name: "game", socketIds: [789]}]
```

---

#### `roomListOf(socketId)`

Returns a list of rooms that contain the specified socket.

**Parameters:**
- `socketId` (Number) - Socket ID

**Returns:** `Promise<Array>` - Array of room names

**Example:**
```js
const rooms = await wsServer.socketStorage.roomListOf(socket.extension.id);
console.log('Socket rooms:', rooms); // ['lobby', 'game-room-1']
```

---

#### `roomFindOne(roomName)`

Finds a room by name.

**Parameters:**
- `roomName` (String) - Room name

**Returns:** `Promise<Object | undefined>` - Room object `{name: String, socketIds: Number[]}` or undefined

**Example:**
```js
const room = await wsServer.socketStorage.roomFindOne('lobby');
if (room) {
  console.log('Room sockets:', room.socketIds);
}
```

---

## DataTransfer Methods

All data transfer methods are accessed via `wsServer.dataTransfer`. These methods handle sending messages to clients.

---

#### `sendOne(msg, socket)`

Sends a message to a single socket.

**Parameters:**
- `msg` (Object) - Message object with structure: `{id, from, to, cmd, payload}`
- `socket` (Socket) - Target socket

**Returns:** `Promise<void>`

**Message Format:**
```js
{
  id: Number,        // Unique message ID
  from: Number,      // Sender socket ID (0 for server)
  to: Number,        // Recipient socket ID
  cmd: String,       // Command/type identifier
  payload: Any       // Message payload (any type)
}
```

**Example:**
```js
const msg = {
  id: 12345,
  from: 0,
  to: socket.extension.id,
  cmd: 'chat',
  payload: { text: 'Hello!', user: 'Server' }
};
await wsServer.dataTransfer.sendOne(msg, socket);
```

---

#### `send(msg, sockets)`

Sends a message to multiple sockets.

**Parameters:**
- `msg` (Object) - Message object
- `sockets` (Array<Socket>) - Array of target sockets

**Returns:** `Promise<void>`

**Example:**
```js
const sockets = await wsServer.socketStorage.find({ authenticated: true });
const msg = { id: 12345, from: 0, to: 0, cmd: 'broadcast', payload: 'Announcement' };
await wsServer.dataTransfer.send(msg, sockets);
```

---

#### `broadcast(msg, socketSender)`

Sends a message to all connected sockets except the sender.

**Parameters:**
- `msg` (Object) - Message object
- `socketSender` (Socket) - The socket that sent the message (will be excluded)

**Returns:** `Promise<void>`

**Example:**
```js
wsServer.on('message', async (msgObj, socket) => {
  // Echo message to all other clients
  await wsServer.dataTransfer.broadcast(msgObj, socket);
});
```

---

#### `sendAll(msg)`

Sends a message to all connected sockets (including the sender).

**Parameters:**
- `msg` (Object) - Message object

**Returns:** `Promise<void>`

**Example:**
```js
const msg = {
  id: 12345,
  from: 0,
  to: 0,
  cmd: 'server-message',
  payload: 'Server restarting in 5 minutes'
};
await wsServer.dataTransfer.sendAll(msg);
```

---

#### `sendRoom(msg, socketSender, roomName)`

Sends a message to all sockets in a specific room, excluding the sender.

**Parameters:**
- `msg` (Object) - Message object
- `socketSender` (Socket) - The socket that sent the message
- `roomName` (String) - Room name

**Returns:** `Promise<void>`

**Example:**
```js
wsServer.on('message', async (msgObj, socket) => {
  // Send to all players in the same game room
  await wsServer.dataTransfer.sendRoom(msgObj, socket, 'game-room-1');
});
```

---

#### `sendError(err, socket)`

Sends an error message to a socket.

**Parameters:**
- `err` (Error) - Error object
- `socket` (Socket) - Target socket

**Returns:** `Promise<void>`

**Example:**
```js
try {
  // Some operation
} catch (err) {
  await wsServer.dataTransfer.sendError(err, socket);
}
```

---

#### `sendID(socket)`

Sends the socket's ID back to the client. Useful for clients to know their assigned ID.

**Parameters:**
- `socket` (Socket) - Target socket

**Returns:** `Promise<void>`

**Example:**
```js
wsServer.on('connection', async (socket) => {
  await wsServer.dataTransfer.sendID(socket);
  // Client receives: {id: ..., from: 0, to: socketId, cmd: 'info/socket/id', payload: socketId}
});
```

---

#### `catchMessage(msg)`

Server-side message interceptor. Returns the message without sending it to clients. Useful for message processing without broadcasting.

**Parameters:**
- `msg` (Any) - Message to catch

**Returns:** `Promise<Any>` - The caught message

**Example:**
```js
// Use in message handlers to intercept messages
const intercepted = await wsServer.dataTransfer.catchMessage(msg);
```

---

## Socket Extension API

The SocketExtension class extends the native Node.js socket object (from `net.Socket`) by adding an `extension` property that provides additional functionality and metadata for WebSocket connections. This extension is automatically created when a client connects to the server.

### What is SocketExtension?

SocketExtension is an internal class that enhances each connected WebSocket socket with:
- **Extended Properties**: Metadata about the connection (ID, IP, timestamp, authentication status, etc.)
- **Convenience Methods**: Helper methods for common operations (authenticate, send messages, manage rooms, etc.)
- **Event Handling**: Automatic cleanup and logging for socket events (close, timeout, error)

The extension is created automatically during the WebSocket handshake process. You don't need to instantiate SocketExtension directly - it's handled internally by the WsServer class.

### How SocketExtension Works

When a client connects:
1. The WebSocket handshake is completed
2. SocketExtension constructor is called internally
3. The `socket.extension` object is created with all properties and methods
4. Socket events are set up for automatic cleanup
5. The socket is ready for use in your event handlers

---

### Properties

All sockets have these extension properties that are set automatically upon connection:

---

#### `id` (Number | String)

**Type:** Number or String  
**Default:** Extracted from `urlQuery.socketID` if present in connection URL, otherwise undefined

Unique identifier for the socket. This ID can be provided by the client as a query parameter in the connection URL, or can be generated server-side if needed.

**Example:**
```js
// Client connects via: ws://localhost:3211/path?socketID=210729152147533020
wsServer.on('connection', (socket) => {
  console.log('Socket ID:', socket.extension.id);
  // Output: Socket ID: 210729152147533020
});
```

**Note:** If no `socketID` is provided in the URL query, `socket.extension.id` will be `undefined`. You may want to generate an ID if needed:
```js
if (!socket.extension.id) {
  socket.extension.id = Date.now(); // or use a UUID generator
}
```

---

#### `ip` (String)

**Type:** String  
**Description:** Client's IP address

The IP address of the connected client. Handles proxy headers (`X-Real-IP`, `X-Forwarded-For`) for accurate IP detection behind reverse proxies like Nginx.

**Example values:**
- `'127.0.0.1'` - Localhost
- `'192.168.1.100'` - Local network
- `'58.123.33.22'` - Public IP

**Example:**
```js
wsServer.on('connection', (socket) => {
  console.log('Client IP:', socket.extension.ip);
  
  // Block specific IPs
  if (socket.extension.ip === '192.168.1.100') {
    socket.extension.removeSocket();
  }
});
```

---

#### `port` (Number)

**Type:** Number  
**Description:** Client's port number

The remote port number of the client connection. Useful for logging and debugging.

**Example:**
```js
wsServer.on('connection', (socket) => {
  console.log('Connection from:', `${socket.extension.ip}:${socket.extension.port}`);
  // Output: Connection from: 192.168.1.100:52341
});
```

---

#### `time` (String)

**Type:** String (ISO 8601 format)  
**Description:** Connection timestamp

The exact time when the socket connection was established, in ISO 8601 format (GMT/UTC).

**Format:** `YYYY-MM-DDTHH:mm:ss.sssZ`

**Example:**
```js
wsServer.on('connection', (socket) => {
  console.log('Connected at:', socket.extension.time);
  // Output: Connected at: 2024-01-15T14:30:45.123Z
  
  // Calculate connection duration
  const connectedAt = new Date(socket.extension.time);
  const now = new Date();
  const duration = Math.floor((now - connectedAt) / 1000);
  console.log(`Connected for ${duration} seconds`);
});
```

---

#### `authenticated` (Boolean | String)

**Type:** Boolean or String  
**Default:** `false`  
**Possible values:** `true`, `false`, `'anonymous'`

Authentication status of the socket. Set automatically when `socket.extension.authenticate()` is called.

- **`true`** - Socket is authenticated (authkey matched)
- **`false`** - Socket authentication failed (authkey didn't match or no authkey provided)
- **`'anonymous'`** - Socket is in anonymous mode (no authkey provided, but authentication was attempted without a key)

**Important:** If `authenticated` is `false` after calling `authenticate()`, the socket will be automatically destroyed after 100ms.

**Example:**
```js
wsServer.on('connection', (socket) => {
  // Initially false
  console.log('Before auth:', socket.extension.authenticated); // false
  
  // Authenticate
  socket.extension.authenticate('secret-key');
  
  // Now true (if authkey matched)
  console.log('After auth:', socket.extension.authenticated); // true | false | 'anonymous'
  
  // Use in conditional logic
  if (socket.extension.authenticated === true) {
    // Allow access to protected features
  } else if (socket.extension.authenticated === 'anonymous') {
    // Allow limited access
  } else {
    // Socket will be destroyed automatically
  }
});
```

---

#### `url` (String)

**Type:** String  
**Description:** The URL path from the WebSocket connection request

The full path portion of the connection URL, including query string.

**Example values:**
- `'/chat'`
- `'/game/room1'`
- `'/api/ws?authkey=TRTmrt&socketID=123'`

**Example:**
```js
wsServer.on('connection', (socket) => {
  console.log('Connection URL:', socket.extension.url);
  // Output: Connection URL: /chat?authkey=TRTmrt
  
  // Route based on URL path
  if (socket.extension.url.startsWith('/chat')) {
    wsServer.socketStorage.roomEnter(socket, 'chat-room');
  } else if (socket.extension.url.startsWith('/game')) {
    wsServer.socketStorage.roomEnter(socket, 'game-room');
  }
});
```

---

#### `urlQuery` (Object)

**Type:** Object  
**Description:** Parsed URL query parameters as key-value pairs

All query parameters from the connection URL are automatically parsed and made available in this object.

**Example:**
```js
// Client connects via: ws://localhost:3211/path?authkey=TRTmrt&socketID=210729152147533020&room=lobby

wsServer.on('connection', (socket) => {
  console.log('Query params:', socket.extension.urlQuery);
  // Output: { authkey: 'TRTmrt', socketID: '210729152147533020', room: 'lobby' }
  
  // Access specific query parameters
  const authkey = socket.extension.urlQuery.authkey;
  const socketID = socket.extension.urlQuery.socketID;
  const room = socket.extension.urlQuery.room;
  
  if (room) {
    wsServer.socketStorage.roomEnter(socket, room);
  }
});
```

**Common use cases:**
- Authentication tokens/keys
- User IDs or session IDs
- Room names for auto-joining
- Client configuration parameters

---

#### `userAgent` (String)

**Type:** String  
**Description:** Client's User-Agent header value

The User-Agent string sent by the client, identifying the browser, application, or client library being used.

**Example values:**
- `'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'`
- `'Node.js WebSocket Client'`
- `'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36'`

**Example:**
```js
wsServer.on('connection', (socket) => {
  console.log('User Agent:', socket.extension.userAgent);
  
  // Detect browser type
  if (socket.extension.userAgent.includes('Chrome')) {
    console.log('Chrome browser detected');
  } else if (socket.extension.userAgent.includes('Firefox')) {
    console.log('Firefox browser detected');
  }
  
  // Log for analytics
  logClientInfo(socket.extension.ip, socket.extension.userAgent);
});
```

---

#### `origin` (String)

**Type:** String  
**Description:** The Origin header value from the WebSocket handshake

The origin URL of the client making the connection. Useful for CORS validation and security checks.

**Example values:**
- `'http://localhost:3000'`
- `'https://example.com'`
- `'https://app.example.com'`

**Example:**
```js
wsServer.on('connection', (socket) => {
  console.log('Origin:', socket.extension.origin);
  
  // Validate origin for security
  const allowedOrigins = ['https://myapp.com', 'https://app.myapp.com'];
  if (!allowedOrigins.includes(socket.extension.origin)) {
    console.log('Unauthorized origin:', socket.extension.origin);
    socket.extension.removeSocket();
  }
});
```

---

#### `nick` (String)

**Type:** String  
**Default:** `''` (empty string)

Custom nickname for the socket. Initially empty, can be set using `socketStorage.setNick()` or by directly assigning a value.

**Example:**
```js
wsServer.on('connection', async (socket) => {
  // Set nickname using socketStorage (ensures uniqueness)
  try {
    await wsServer.socketStorage.setNick(socket, 'Player1');
    console.log('Nickname set:', socket.extension.nick); // 'Player1'
  } catch (err) {
    console.error('Nickname already exists');
  }
  
  // Or set directly (doesn't check for uniqueness)
  socket.extension.nick = 'Player1';
  
  // Use in messages
  await socket.extension.sendSelf({
    id: Date.now(),
    from: 0,
    to: socket.extension.id,
    cmd: 'welcome',
    payload: `Welcome, ${socket.extension.nick}!`
  });
});
```

---

#### `wsOpts` (Object)

**Type:** Object  
**Description:** Copy of the WebSocket server options used for this connection

A reference to the configuration options that were used when creating the WsServer instance. Useful for accessing server configuration from socket-level code.

**Properties:**
- `timeout` - Inactivity timeout in milliseconds
- `maxConns` - Maximum total connections
- `maxIPConns` - Maximum connections per IP
- `storage` - Storage type
- `subprotocol` - Subprotocol name
- `version` - WebSocket version
- `debug` - Debug mode flag
- And other options...

**Example:**
```js
wsServer.on('connection', (socket) => {
  console.log('Server timeout:', socket.extension.wsOpts.timeout);
  console.log('Subprotocol:', socket.extension.wsOpts.subprotocol);
  console.log('Max connections:', socket.extension.wsOpts.maxConns);
  
  // Use for conditional logic
  if (socket.extension.wsOpts.debug) {
    console.log('Debug mode enabled - logging all events');
  }
});
```

---

### Complete Property Example

Here's a complete example showing all properties:

```js
wsServer.on('connection', (socket) => {
  console.log('=== Socket Extension Properties ===');
  console.log('ID:', socket.extension.id);
  console.log('IP:', socket.extension.ip);
  console.log('Port:', socket.extension.port);
  console.log('Time:', socket.extension.time);
  console.log('Authenticated:', socket.extension.authenticated);
  console.log('URL:', socket.extension.url);
  console.log('URL Query:', socket.extension.urlQuery);
  console.log('User Agent:', socket.extension.userAgent);
  console.log('Origin:', socket.extension.origin);
  console.log('Nick:', socket.extension.nick);
  console.log('WS Options:', socket.extension.wsOpts);
  
  // Example output:
  // ID: 210729152147533020
  // IP: 192.168.1.100
  // Port: 52341
  // Time: 2024-01-15T14:30:45.123Z
  // Authenticated: false
  // URL: /chat?authkey=TRTmrt&socketID=210729152147533020
  // URL Query: { authkey: 'TRTmrt', socketID: '210729152147533020' }
  // User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...
  // Origin: http://localhost:3000
  // Nick: 
  // WS Options: { timeout: 300000, maxConns: 10000, ... }
});
```

---

### Methods

#### `authenticate(authkey)`

Authenticates the socket by comparing the provided authkey with the authkey from the URL query parameters.

**Parameters:**
- `authkey` (String) - Expected authentication key

**Behavior:**
- If authkey matches URL query `authkey`, sets `socket.extension.authenticated = true`
- If authkey doesn't match, sets `socket.extension.authenticated = false` and destroys the socket
- If no authkey provided, sets `socket.extension.authenticated = 'anonymous'`

**Example:**
```js
wsServer.on('connection', (socket) => {
  // Client connects via: ws://localhost:3211/path?authkey=TRTmrt
  const expectedKey = 'TRTmrt'; // Usually fetched from database
  socket.extension.authenticate(expectedKey);
  
  if (socket.extension.authenticated) {
    console.log('Socket authenticated');
  }
});
```

---

#### `changeTimeout()`

Changes the socket timeout based on the WebSocket server options. Usually called internally.

**Example:**
```js
socket.extension.changeTimeout();
```

---

#### `addSocket()`

Adds the socket to storage. Usually called internally during connection setup.

**Example:**
```js
socket.extension.addSocket();
```

---

#### `removeSocket()`

Removes the socket from storage and destroys the connection.

**Example:**
```js
socket.extension.removeSocket();
```

---

#### `exitAllRooms()`

Removes the socket from all rooms.

**Example:**
```js
socket.extension.exitAllRooms();
```

---

#### `sendSelf(msg)`

Sends a message to this socket (convenience method).

**Parameters:**
- `msg` (Object) - Message object

**Example:**
```js
socket.extension.sendSelf({
  id: 12345,
  from: 0,
  to: socket.extension.id,
  cmd: 'welcome',
  payload: 'Welcome to the server!'
});
```

---

## Events

The WebSocket server emits several events that you can listen to.

---

### `connection` Event

Emitted when a new client connects.

**Callback:** `(socket) => void`

**Example:**
```js
wsServer.on('connection', async (socket) => {
  console.log('New connection:', socket.extension.id);
  
  // Authenticate
  socket.extension.authenticate('your-auth-key');
  
  // Add to a room
  wsServer.socketStorage.roomEnter(socket, 'lobby');
  
  // Send welcome message
  await wsServer.dataTransfer.sendID(socket);
});
```

---

### `message` Event

Emitted when a message is received from a client.

**Callback:** `(msg) => void`

**Example:**
```js
wsServer.on('message', (msg) => {
  console.log('Message received:', msg);
  console.log('From:', msg.from);
  console.log('Command:', msg.cmd);
  console.log('Payload:', msg.payload);
});
```

---

### `message-error` Event

Emitted when message parsing fails.

**Callback:** `(error) => void`

**Example:**
```js
wsServer.on('message-error', (err) => {
  console.error('Message parsing error:', err.message);
});
```

---

### `route` Event

Emitted for routed messages (when using subprotocol routing).

**Callback:** `(msgObj, socket, dataTransfer, socketStorage, eventEmitter) => void`

**Example:**
```js
wsServer.on('route', (msgObj, socket, dataTransfer, socketStorage, eventEmitter) => {
  const { uri, body } = msgObj.payload;
  
  if (uri === '/api/user/login') {
    // Handle login
  } else if (uri === '/api/chat/send') {
    // Handle chat message
  }
});
```

---

## Configuration Options

### WsServer Options (`wsOpts`)

```js
{
  timeout: Number,           // Inactivity timeout in ms (0 = never timeout, default: 300000 = 5 min)
  allowHalfOpen: Boolean,    // Allow half-open connections (default: false)
  maxConns: Number,          // Maximum total connections (default: 10000)
  maxIPConns: Number,        // Maximum connections per IP (0 = unlimited, default: 3)
  storage: String,           // Storage type: 'memory' (default: 'memory')
  subprotocol: String,       // Subprotocol name (default: 'jsonRWS')
  tightening: Number,        // Delay between operations in ms (default: 400)
  autodelayFactor: Number,   // DDoS protection factor (default: 500)
  version: Number,           // WebSocket version (default: 13)
  debug: Boolean,            // Enable debug logging (default: false)
  showInfo: Boolean          // Show informational messages (default: true)
}
```

---

### WsHttpServer Options (`httpOpts`)

```js
{
  port: Number,              // Server port (required if httpOpts provided)
  timeout: Number,           // Connection timeout in ms (0 = never timeout, default: 300000)
  showInfo: Boolean          // Show informational messages (default: false)
}
```

---

## Complete Example

```js
const { WsServer, WsHttpServer } = require('@mikosoft/ws-server');

// HTTP Server
const wsHttpServer = new WsHttpServer({
  port: 3211,
  timeout: 0,
  showInfo: true
});
const httpServer = wsHttpServer.start();

// WebSocket Server
const wsServer = new WsServer({
  timeout: 5 * 60 * 1000,
  maxConns: 1000,
  maxIPConns: 5,
  storage: 'memory',
  subprotocol: 'jsonRWS',
  version: 13,
  debug: false
});
wsServer.socketStorage.init(null);
wsServer.bootup(httpServer);

// Connection handler
wsServer.on('connection', async (socket) => {
  console.log('Client connected:', socket.extension.id);
  
  // Authenticate
  socket.extension.authenticate('secret-key');
  
  // Add to lobby room
  wsServer.socketStorage.roomEnter(socket, 'lobby');
  
  // Send socket ID
  await wsServer.dataTransfer.sendID(socket);
  
  // Send welcome message
  await socket.extension.sendSelf({
    id: Date.now(),
    from: 0,
    to: socket.extension.id,
    cmd: 'welcome',
    payload: 'Welcome to the server!'
  });
});

// Message handler
wsServer.on('message', async (msg) => {
  console.log('Message:', msg.cmd, msg.payload);
  
  // Find sender socket
  const sender = await wsServer.socketStorage.findOne({ id: msg.from });
  if (!sender) return;
  
  // Handle different commands
  if (msg.cmd === 'chat') {
    // Broadcast to lobby
    await wsServer.dataTransfer.sendRoom({
      id: Date.now(),
      from: msg.from,
      to: 0,
      cmd: 'chat',
      payload: msg.payload
    }, sender, 'lobby');
  }
});

// Error handler
wsServer.on('message-error', (err) => {
  console.error('Message error:', err);
});
```

---

## License

Copyright (c) 2021- Mikosoft licensed under [MIT](../LICENSE).

---

## Website

[http://libs.mikosoft.info/websocket/ws-server](http://libs.mikosoft.info/websocket/ws-server)

