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

var log = Bunyan.createLogger({
  'name': 'upnp-scrobble',
  'level': config.logLevel
});

log.info('Hi');

var devices = {};

var server = http.createServer();
server.listen(config.serverPort);

var upnp = require('peer-upnp');
upnp.createPeer({
  'server': server
}).on('ready', function (peer) {
  peer.on(config.serviceType, function (service) {
    log.info('Found a service',
      service.USN);

    if (devices[service.USN]) {
      return;
    }

    var lastPlay = {};
    service/*.bind(function (service) {
      const b = 1;
    })*/.on('event', function (data) {
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

          const play = {
            'artist': objectPath.get(data, 'DIDL-Lite.item.upnp:artist'),
            'track': objectPath.get(data, 'DIDL-Lite.item.dc:title'),
            'album': objectPath.get(data, 'DIDL-Lite.item.upnp:album')
          };

          if (_.isEqual(lastPlay, play)) {
            log.warn('Already scrobbled play',
              prettyJson(play));
            return;
          }

          lastPlay = play;

          // TODO scrobble occurs immediately - usual experience: scrobble is triggered at around 80% of the position.
          const scribble = new Scribble(config.lastfm.key,
            config.lastfm.secret,
            config.lastfm.username,
            config.lastfm.password);
          scribble.Scrobble(lastPlay, (response) => log.info('scrobbled a play', response));
        });
      });
    }).on('disappear', function (service) {
      delete devices[service.USN];
    });
  });
}).start();