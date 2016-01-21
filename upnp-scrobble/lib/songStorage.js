'use strict';

const EventEmitter = require('events');

class SongStorage extends EventEmitter {
  constructor() {
    super();
    this._storage = new Map();
  };
  setSong(deviceKey, song) {
    this._storage.set(deviceKey, song);
    this.emit('setSong', {
      "deviceKey": deviceKey,
      "song": song
    });
  };
  clearSong(deviceKey) {
    this._storage.delete(deviceKey);
    this.emit('clearSong', {
      "deviceKey": deviceKey
    });
  };
};

module.exports = SongStorage;
