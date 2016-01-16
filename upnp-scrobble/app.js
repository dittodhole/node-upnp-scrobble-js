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

var container = {
  "parseDuration": function (duration) {
    if (!duration) {
      return -1;
    }

    const parts = duration.split(':');
    const seconds = (+parts[0]) * 60 * 60 + (+parts[1]) * 60 + (+parts[2]);

    return seconds;
  },
  "prettyJson": function (obj) {
    return JSON.stringify(obj, null, 2);
  },
  "scribble": new Scribble(config.lastfm.key,
    config.lastfm.secret,
    config.lastfm.username,
    config.lastfm.password),
  "logger": Bunyan.createLogger({
    "name": 'upnp-scrobble',
    "level": config.logLevel
  }),
  "server": http.createServer(function (req, res) {
    container.logger.info('Receiving request',
      req.rawHeaders.slice(2, 8));

  }).listen(config.serverPort)
};

container.logger.info('Hi');

upnp.createPeer({
  "server": container.server
}).on('ready', function (peer) {
  container.peer = peer;
  const intervalFn = function () {
    peer.removeListener(config.serviceType, handleService);
    peer.on(config.serviceType, handleService);
  };
  peer.on('disappear', unhandleService);
  setInterval(intervalFn, config.scanInterval || 30000);
  intervalFn();
}).start();

function handleService(service) {
  container.logger.info('Found a service',
    service.USN,
    service.device.modelName);

  service.cancelScrobbling = () => {
    clearTimeout(service.scrobbleTimeout);
    service.scrobbleTimeout = null;
  };
  service.dispose = () => {
    clearTimeout(service.heartbeatInterval);
    service.heartbeatInterval = null;
  };

  service.heartbeatInterval = setInterval(() => {
    log.info('Still alive',
      service.USN,
      service.device.modelName);
  }, 10 * 1000);

  service.bind((serviceClient) => {
    service.serviceClient = serviceClient;
  });
  service.on('event', (data) => handleEvent(data, service));
};

function handleEvent(data, service) {
  container.logger.info('Received an event from service',
    service.USN,
    container.prettyJson(data));

  const lastChange = data.LastChange;
  if (!_.isString(lastChange)) {
    container.logger.warn('LastChange was not of type string',
      container.prettyJson(data));
    return;
  }

  xmlParser.parseString(lastChange, (error, data) => {
    if (error) {
      container.logger.warn(error,
        'Could not parse lastChange',
        lastChange);
      return;
    }

    const transportState = objectPath.get(data, 'Event.InstanceID.TransportState.val');
    if (transportState === 'NO_MEDIA_PRESENT') {
      container.logger.info('No media present');
      service.cancelScrobbling();
      return;
    }

    if (transportState === 'PAUSED_PLAYBACK') {
      container.logger.info('Playback paused');
      service.cancelScrobbling();
      return;
    }

    const metadata = objectPath.get(data, 'Event.InstanceID.AVTransportURIMetaData.val');
    if (transportState === 'PLAYING'
      || metadata) {
      container.logger.info('Playing');

      const instanceId = objectPath.get(data, 'Event.InstanceID.val');

      metadata = metadata || service.lastMetadata;
      if (!metadata) {
        container.logger.warn('No metadata inside',
          container.prettyJson(data));
        return;
      }

      service.lastMetadata = metadata;

      xmlParser.parseString(metadata, (error, data) => {
        if (error) {
          container.logger.error(error,
            'Could not parse metadata',
            metadata);
          return;
        }

        container.song = {
          'artist': objectPath.get(data, 'DIDL-Lite.item.upnp:artist'),
          'track': objectPath.get(data, 'DIDL-Lite.item.dc:title'),
          'album': objectPath.get(data, 'DIDL-Lite.item.upnp:album'),
          'duration': objectPath.get(data, 'DIDL-Lite.item.res.duration')
        };

        service.cancelScrobbling();

        container.scribble.NowPlaying(container.song);

        if (service.serviceClient.GetPositionInfo) {
          service.serviceClient.GetPositionInfo({
            'InstanceID': instanceId
          }, (result) => {
            const trackDuration = parseDuration(result.TrackDuration);
            if (trackDuration === -1) {
              return;
            }

            const relTime = container.parseDuration(result.RelTime);
            if (relTime === -1) {
              return;
            }

            const offset = Math.max(1, trackDuration * 0.8 - relTime) * 1000;
            service.scrobbleTimeout = setTimeout(() => {
              container.scribble.Scrobble(container.song);
            }, offset);
          });
        }
      });
    }
  });
};

function unhandleService(service) {
  service.cancelScrobbling();
  service.dispose();
  service.removeAllListeners('event');
};