'use strict';


const _ = require('underscore');

const config = _.extend({
  "serviceType": 'urn:schemas-upnp-org:service:AVTransport:1',
  "scanTimeoutInSeconds": 30,
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
peerClient.on('stopped', (obj) => {
  let serviceKey = obj.serviceKey;
  songStorage.delete(serviceKey);
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

  //song.absoluteScrobbleOffsetInSeconds = song.durationInSeconds * (config.scrobbleFactor || 0.8);
  //song.relativeScrobbleOffsetInSeconds = Math.max(1, song.absoluteScrobbleOffsetInSeconds - song.positionInSeconds);

  // TODO send nowPlaying
  // TODO enqueue timer for scrobble
});
