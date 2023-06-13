const socketStorageMemory = require('./socketStorageMemory');
// const socketStorageFile = require('./socketStorageFile'); // TODO
// const socketStorageRedis = require('./socketStorageRedis'); // TODO
// const socketStorageMongoDB = require('./socketStorageMongoDB'); // TODO


/**
 * * Select and init the websocket storage.
 * @param {object} wsOpts - RWS options
 * @returns {object}
 */
module.exports = (wsOpts) => {
  let socketStorage;
  const storageType = wsOpts.storage.toLowerCase(); //  'memory', 'file', 'redis', 'mongodb', ...

  if (storageType === 'memory') {
    socketStorage = socketStorageMemory;
  } else { // default storage is 'memory'
    socketStorage = socketStorageMemory;
  }

  return socketStorage;
};
