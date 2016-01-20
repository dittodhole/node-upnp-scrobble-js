var events = require('events');
var utils = require('utils');

function songStorage() {
  events.EventEmitter.call(this);

  var storage = {};
  this.clearSong = function (deviceKey) {
    storage.delete(deviceKey);
    this.emit('cleared', deviceKey);
  };
  this.setSong = function (deviceKey, song) {
    storage[deviceKey] = song;
    this.emit('set', deviceKey, song);
  };

  return this;
};

utils.inherit(songStorage, events);

module.exports = songStorage;