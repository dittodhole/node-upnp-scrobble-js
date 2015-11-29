const Bunyan = require('bunyan');
const http = require('http');
const upnp = require('peer-upnp');
const _ = require('underscore');
const xml2js = require('xml2js');
const xmlParser = new xml2js.Parser({
  'mergeAttrs': true,
  'explicitArray': false,
  'ignoreXmlns': true
});
const objectPath = require('object-path');
const Scribble = require('scribble');

const config = require('./config.json');

'use strict';

function prettyJson(obj) {
  return JSON.stringify(obj, null, 2);
};

function parseDuration(duration) {
  if (!duration) {
    return -1;
  }

  const parts = duration.split(':');
  const seconds = (+parts[0]) * 60 * 60 + (+parts[1]) * 60 + (+parts[2]);
  return seconds;
}

const scribble = new Scribble(config.lastfm.key,
  config.lastfm.secret,
  config.lastfm.username,
  config.lastfm.password);

const log = Bunyan.createLogger({
  'name': 'upnp-scrobble',
  'level': config.logLevel
});

log.info('Hi');

const server = http.createServer();
server.listen(config.serverPort);

upnp.createPeer({
  'server': server
}).on('ready', (peer) => {
  const intervalFn = () => {
    peer.removeListener(config.serviceType, handleService);
    peer.on(config.serviceType, handleService);
  };
  peer.on('disappear', unhandleService);
  setInterval(intervalFn, config.scanInterval || 30000);
  intervalFn();
}).start();

function handleService(service) {
  log.info('Found a service',
    service.USN,
    service.device.modelName);

  service.clearScrobbleTimeout = () => {
    clearTimeout(service.scrobbleTimeout);
    service.scrobbleTimeout = null;
  };

  service.bind((serviceClient) => {
    service.serviceClient = serviceClient;
  });
  service.on('event', (data) => handleEvent(data, service));
};

function handleEvent(data, service) {
  log.info('Received an event from service',
    service.USN,
    prettyJson(data));

  const lastChange = data.LastChange;
  if (!_.isString(lastChange)) {
    log.warn('LastChange was not of type string',
      prettyJson(data));
    return;
  }

  xmlParser.parseString(lastChange, (error, data) => {
    if (error) {
      log.warn(error,
        'Could not parse lastChange',
        lastChange);
      return;
    }

    const transportState = objectPath.get(data, 'Event.InstanceID.TransportState.val');
    if (transportState === 'NO_MEDIA_PRESENT') {
      log.info('No media present');
      service.clearScrobbleTimeout();
      return;
    }

    const instanceId = objectPath.get(data, 'Event.InstanceID.val');

    const metadata = objectPath.get(data, 'Event.InstanceID.AVTransportURIMetaData.val');
    if (!metadata) {
      log.warn('No metadata inside',
        prettyJson(data));
      return;
    }

    xmlParser.parseString(metadata, (error, data) => {
      if (error) {
        log.error(error,
          'Could not parse metadata',
          metadata);
        return;
      }

      const song = {
        'artist': objectPath.get(data, 'DIDL-Lite.item.upnp:artist'),
        'track': objectPath.get(data, 'DIDL-Lite.item.dc:title'),
        'album': objectPath.get(data, 'DIDL-Lite.item.upnp:album'),
        'duration': objectPath.get(data, 'DIDL-Lite.item.res.duration')
      };

      if (_.isEqual(service.lastSong, song)) {
        log.warn('Already scrobbled song',
          prettyJson(song));
        return;
      }

      service.clearScrobbleTimeout();

      service.lastSong = song;

      scribble.NowPlaying(song);

      if (service.serviceClient.GetPositionInfo) {
        service.serviceClient.GetPositionInfo({
          'InstanceID': instanceId
        }, (result) => {
          const trackDuration = parseDuration(result.TrackDuration);
          const relTime = parseDuration(result.RelTime);
          const offset = Math.max(1, trackDuration * 0.8 - relTime) * 1000;
          service.scrobbleTimeout = setTimeout(() => {
            scribble.Scrobble(song);
          }, offset);
        });
      }
    });
  });
};

function unhandleService(service) {
  service.clearScrobbleTimeout();
  service.removeAllListeners('event');
};