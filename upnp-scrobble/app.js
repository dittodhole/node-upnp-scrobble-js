var Bunyan = require('bunyan');
var http = require('http');
var _ = require('underscore');
var xml2js = require('xml2js');
var xmlParser = new xml2js.Parser({
  'mergeAttrs': true,
  'explicitArray': false,
  'ignoreXmlns': true
});
var objectPath = require('object-path');
var Scribble = require('scribble');

var config = require('./config.json');

'use strict';

function prettyJson(obj) {
  return JSON.stringify(obj, null, 2);
};

function parseDuration(duration) {
  const parts = duration.split(':');
  const seconds = (+parts[0]) * 60 * 60 + (+parts[1]) * 60 + (+parts[2]);
  return seconds;
}

const scribble = new Scribble(config.lastfm.key,
  config.lastfm.secret,
  config.lastfm.username,
  config.lastfm.password);

var log = Bunyan.createLogger({
  'name': 'upnp-scrobble',
  'level': config.logLevel
});

log.info('Hi');

var server = http.createServer();
server.listen(config.serverPort);

var upnp = require('peer-upnp');
upnp.createPeer({
  'server': server
}).on('ready', function (peer) {
  const intervalFn = () => {
    peer.removeListener(config.serviceType, handleService);
    peer.on(config.serviceType, handleService);
  };
  peer.on('disappear', unhandleService);
  setInterval(intervalFn, config.scanInterval || 30000);
  intervalFn();
}).
start();

var services = {};

function handleService(service) {
  log.info('Found a service',
    service.USN);

  if (services[service.USN]) {
    return;
  }

  services[service.USN] = service;

  service.clearScrobbleTimeout = function () {
    if (!service.scrobbleTimeout) {
      return;
    }

    clearTimeout(service.scrobbleTimeout);
    service.scrobbleTimeout = null;
  };

  service.bind(function (serviceClient) {
    service.serviceClient = serviceClient;
  });
  service.on('event', (data) => handleEvent(data, service));
};

function handleEvent(data, service) {
  log.info('Received an event from service',
    service.USN,
    prettyJson(data));

  var lastChange = data.LastChange;
  if (!_.isString(lastChange)) {
    return;
  }

  xmlParser.parseString(lastChange, function (error, data) {
    if (error) {
      log.warn(error,
        'Could not parse lastChange',
        lastChange);
      return;
    }

    var metadata = objectPath.get(data, 'Event.InstanceID.AVTransportURIMetaData.val');
    if (!metadata) {
      log.warn('No metadata inside',
        prettyJson(data));
      return;
    }

    xmlParser.parseString(metadata, function (error, data) {
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
          'InstanceID': 0
        }, (result) => {
          var trackDuration = parseDuration(result.TrackDuration);
          var relTime = parseDuration(result.RelTime);
          var offset = Math.max(1, trackDuration * 0.8 - relTime) * 1000;
          service.scrobbleTimeout = setTimeout(() => {
            scribble.Scrobble(song);
          }, offset);
        });
      }
    });
  });
};

function unhandleService(service) {
  service = services[service.USN];
  if (service) {
    service.clearScrobbleTimeout();
    service.removeAllListeners('event');

    delete services[service.USN];
  }
}