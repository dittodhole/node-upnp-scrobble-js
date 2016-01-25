'use strict';

const _ = require('underscore');

const config = _.extend({
  "scanTimeoutInSeconds": 30,
  "scrobbleFactor": 0.8,
  "serviceType": 'urn:schemas-upnp-org:service:AVTransport:1',
  "upnpPort": 0,
  "webServerPort": 8080
}, require('./config.json'));


const WebServer = require('./lib/WebServer');
const webServer = new WebServer(config.webServerPort, {
  "index": {
    "scrobbleFactor": config.scrobbleFactor
  }
});

const Scribble = require('scribble');
const scribble = new Scribble(config.lastfm.key, config.lastfm.secret, config.lastfm.username, config.lastfm.password);

const SongParser = require('./lib/SongParser');
const songParser = new SongParser();

const PeerClient = require('./lib/PeerClient');
const peerClient = new PeerClient(songParser, config.upnpPort);
peerClient.attachToServices(config.serviceType, config.scanTimeoutInSeconds);

const songStorage = new Map();
const scrobbleTimeouts = new Map();
peerClient.on('stopped', (data) => {
  let serviceKey = data.serviceKey;

  let scrobbleTimeout = scrobbleTimeouts.get(serviceKey);
  if (scrobbleTimeout) {
    clearTimeout(scrobbleTimeout);
    scrobbleTimeouts.delete(serviceKey);
    scrobbleTimeout = null;
  }

  let song = songStorage.get(serviceKey);
  if (song) {
    if (song.status === 'stopped') {
      return;
    }
    song.status = 'stopped';
  } else {
    return;
  }

  webServer.publish({
    "type": 'stop',
    "serviceKey": serviceKey
  });
});
peerClient.on('playing', (data) => {
  let serviceKey = data.serviceKey;
  let song = data.song;
  if (!song) {
    return;
  }
  if (song.status === 'playing') {
    return;
  }

  song.status = 'playing';

  songStorage.set(serviceKey, song);

  scribble.NowPlaying(song);

  webServer.publish({
    "type": "play",
    "serviceKey": serviceKey,
    "song": song
  });

  let scrobbleTimeout = scrobbleTimeouts.get(serviceKey);
  if (scrobbleTimeout) {
    clearTimeout(scrobbleTimeout);
    scrobbleTimeouts.delete(serviceKey);
    scrobbleTimeout = null;
  }

  let positionInSeconds = song.positionInSeconds + (Date.now() - song.timestamp) / 1000;
  let scrobbleOffsetInSeconds = Math.max(1, song.durationInSeconds * config.scrobbleFactor - positionInSeconds);
  scrobbleTimeout = setTimeout(() => {
    scribble.Scrobble(song);

    webServer.publish({
      "type": "scrobble",
      "serviceKey": serviceKey,
      "song": song
    });
  }, scrobbleOffsetInSeconds * 1000);
  scrobbleTimeouts.set(serviceKey, scrobbleTimeout);
});
peerClient.on('continue', (data) => {
  let serviceKey = data.serviceKey;
  let position = data.position;
  let song = songStorage.get(serviceKey);
  if (!song) {
    return;
  }

  data.song = _.extend(song, position);

  peerClient.emit('playing', data);
});
peerClient.on('event', (complexEvent) => {
  console.log(complexEvent);
  /*
  webServer.publish({
    "type": 'complexEvent',
    "serviceKey": complexEvent.serviceKey,
    "complexEvent": complexEvent
  });
  */
});
peerClient.on('serviceDiscovered', (service) => {
  let serviceKey = peerClient.getServiceKey(service);

  webServer.publish({
    "type": 'serviceDiscovered',
    "serviceKey": serviceKey,
    "service": mapService(service)
  });
});
peerClient.on('serviceDisappeared', (service) => {
  let serviceKey = peerClient.getServiceKey(service);

  let scrobbleTimeout = scrobbleTimeouts.get(serviceKey);
  if (scrobbleTimeout) {
    clearTimeout(scrobbleTimeout);
    scrobbleTimeouts.delete(serviceKey);
    scrobbleTimeout = null;
  }

  webServer.publish({
    "type": 'serviceDisappeared',
    "serviceKey": serviceKey
  });
});

webServer.on('getServices', () => {
  var services = peerClient.getServices();
  webServer.publish({
    "type": 'getServicesResponse',
    "services": Array.from(services, mapService)
  });
});

function mapService(service) {
  let serviceKey = peerClient.getServiceKey(service);

  service = {
    "deviceIcon": service.device.icons[0].url,
    "deviceName": service.device.friendlyName,
    "deviceModelName": service.device.modelName,
    "serviceKey": serviceKey
  };

  let song = songStorage.get(service.serviceKey);
  if (song) {
    service.song = song;
  }

  return service;
}
