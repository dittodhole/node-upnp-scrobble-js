'use strict';


const _ = require('underscore');

const config = _.extend({
  "scanTimeoutInSeconds": 30,
  "scrobbleFactor": 0.8,
  "serviceType": 'urn:schemas-upnp-org:service:AVTransport:1',
  "webServerPort": 8080
}, require('./config.json'));


const WebServer = require('./lib/WebServer');
const webServer = new WebServer(config.webServerPort);

const Scribble = require('scribble');
const scribble = new Scribble(config.lastfm.key, config.lastfm.secret, config.lastfm.username, config.lastfm.password);

const SongParser = require('./lib/SongParser');
const songParser = new SongParser();

const PeerClient = require('./lib/PeerClient');
const peerClient = new PeerClient(songParser, config.upnpPort);
peerClient.attachToServices(config.serviceType, config.scanTimeoutInSeconds);

const songStorage = new Map();
const scrobbleTimeouts = new Map();
peerClient.on('stopped', (obj) => {
  let serviceKey = obj.serviceKey;
  songStorage.delete(serviceKey);

  let timeout = scrobbleTimeouts.get(serviceKey);
  if (timeout) {
    clearTimeout(timeout);
    scrobbleTimeouts.delete(serviceKey);
  }
});
peerClient.on('playing', (obj) => {
  let serviceKey = obj.serviceKey;
  let song = obj.song;
  if (!song) {
    song = songStorage.get(serviceKey);
  }
  if (!song) {
    return;
  }

  scribble.NowPlaying(song);

  let timeout = scrobbleTimeouts.get(serviceKey);
  if (timeout) {
    clearTimeout(timeout);
    scrobbleTimeouts.delete(serviceKey);
  }

  let positionInSeconds = song.positionInSeconds + (Date.now() - song.timestamp);
  let scrobbleOffsetInSeconds = Math.max(1, song.durationInSeconds * config.scrobbleFactor - positionInSeconds);
  timeout = setTimeout(() => scribble.Scrobble(song));
  scrobbleTimeouts.set(serviceKey, timeout);
});
