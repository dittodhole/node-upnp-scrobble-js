const Bunyan = require('bunyan');
const http = require('http');
const upnp = require('peer-upnp');
const _ = require('underscore');
const xml2js = require('xml2js');
const xmlParser = new xml2js.Parser({
  "mergeAttrs": true,
  "explicitArray": false,
  "ignoreXmlns": true
});
const objectPath = require('object-path');
const Scribble = require('scribble');
const handlebars = require('handlebars');
const fs = require('fs');
const pd = require('pretty-data2').pd;

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
  "server": http.createServer()
    .on('request', function (req, res) {
      if (req.url !== '/') {
        container.logger.info('Receiving request',
          req.rawHeaders.slice(2, 8));
        return;
      }

      const source = fs.readFileSync('views/index.hbs', 'utf-8');
      const template = handlebars.compile(source);
      const html = template(container);
      res.writeHead(200, {
        "Content-Type": 'text/html'
      });
      res.write(html);
      res.end();
    }).listen(config.serverPort),
  "unhandleService": function (service) {
    container.logger.info('removing service',
      {
        "USN": service.USN
      });

    service.clearScrobbleSongTimeout();
    service.removeAllListeners('event');
  },
  "resetPeer": function () {
    container.logger.info('resetting peer');
    clearTimeout(container.scanTimeout);
    container.scanTimeout = null;

    // as peer-upnp offers no functionality to remove one service explicitly,
    // we have to close the peer, and force a fresh upnp-discovery
    _.each(container.peer.remoteDevices, function (remoteDevice) {
      _.each(remoteDevice.services, function (service) {
        if (service.clearScrobbleSongTimeout) {
          container.unhandleService(service);
        }
      });
    });

    container.peer.close();
    container.peer = null;

    // forcing a fresh upnp-discovery in 5 seconds (for a clean stack)
    setTimeout(joinUpnpNetwork, 5 * 1000);
  },
  "scrobbleSong": function () {
    if (!container.scribble) {
      return;
    }
    if (!container.song) {
      return;
    }
    container.scribble.Scrobble(container.song);
  },
  "getRemainingTimeFromTimeout": function (timeout, fallbackTimestamp) {
    var idleStart = timeout._idleStart;
    if (idleStart < fallbackTimestamp) {
      idleStart += fallbackTimestamp;
    }
    const idleTimeout = timeout._idleTimeout;
    const remainingTime = idleStart + idleTimeout - Date.now();

    return remainingTime;
  }
};

container.logger.info('Hi');

function joinUpnpNetwork() {
  container.logger.info('joining the upnp network');

  upnp.createPeer({
    "server": container.server
  }).on('ready', function (peer) {
    container.peer = peer;
    peer.on('disappear', container.unhandleService);

    const scanFn = function () {
      peer.removeListener(config.serviceType, handleService);
      peer.on(config.serviceType, handleService);

      container.scanTimeout = setTimeout(scanFn, config.scanInterval || 30 * 1000);
    };
    scanFn();
  }).start();
};

function handleService(service) {
  container.logger.info('Found a service',
    {
      "USN": service.USN,
      "model": service.device.modelName
    });

  service.initTimestamp = Date.now();

  service.clearScrobbleSongTimeout = function () {
    container.song = null;
    container.playingSince = null;
    container.playingUntil = null;
    container.scrobblingAt = null;
    clearTimeout(service.scrobbleSongTimeout);
    service.scrobbleSongTimeout = null;
  };

  service.bind(function (serviceClient) {
    service.serviceClient = serviceClient;
  }).on('event', function (data) {
    handleEvent(data, service);
  });
};

function handleEvent(data, service) {
  container.logger.info('Received an event from service',
    {
      "USN": service.USN,
      "data": container.prettyJson(data)
    });

  if (container.resetPeerTimeout) {
    clearTimeout(container.resetPeerTimeout);
    container.resetPeerTimeout = null;
  }

  // reset peer-upnp 10 seconds after the renew-timeout, if no event is triggered by the renewal-process
  //container.resetPeerTimeout = setTimeout(container.resetPeer, (remainingTrackDuration + 10) * 1000);
  const resetPeerOffset = container.getRemainingTimeFromTimeout(service.timeoutHandle, service.initTimestamp);
  container.resetPeerTimeout = setTimeout(container.resetPeer, resetPeerOffset);

  const lastChange = data.LastChange;
  if (!_.isString(lastChange)) {
    container.logger.warn('LastChange was not of type string',
      {
        "data": container.prettyJson(data)
      });
    return;
  }

  xmlParser.parseString(lastChange, function (error, data) {
    if (error) {
      container.logger.warn(error,
        'Could not parse lastChange',
        lastChange);
      return;
    }

    const transportState = objectPath.get(data, 'Event.InstanceID.TransportState.val');
    if (transportState === 'NO_MEDIA_PRESENT') {
      container.logger.info('No media present');
      service.clearScrobbleSongTimeout();
      return;
    }

    if (transportState === 'PAUSED_PLAYBACK') {
      container.logger.info('Playback paused');
      service.clearScrobbleSongTimeout();
      return;
    }

    // TODO implement other transportStates

    var metadata = objectPath.get(data, 'Event.InstanceID.AVTransportURIMetaData.val');
    if (transportState === 'PLAYING'
      || metadata) {
      container.logger.info('Playing');

      const instanceId = objectPath.get(data, 'Event.InstanceID.val');

      metadata = metadata || service.lastMetadata;
      if (!metadata) {
        container.logger.warn('No metadata inside',
          {
            "data": container.prettyJSON(data)
          });
        return;
      }

      // TODO move to handlebars helper - this is only relevant to the view
      service.lastMetadata = pd.xml(metadata);

      xmlParser.parseString(metadata, function (error, data) {
        if (error) {
          container.logger.error(error,
            'Could not parse metadata',
            metadata);
          return;
        }

        service.clearScrobbleSongTimeout();

        container.song = {
          "artist": objectPath.get(data, 'DIDL-Lite.item.upnp:artist'),
          "track": objectPath.get(data, 'DIDL-Lite.item.dc:title'),
          "album": objectPath.get(data, 'DIDL-Lite.item.upnp:album'),
          "duration": objectPath.get(data, 'DIDL-Lite.item.res.duration'),
          "albumArtURI": objectPath.get(data, 'DIDL-Lite.item.upnp:albumArtURI._')
        };

        container.scribble.NowPlaying(container.song);
        container.playingSince = new Date();

        if (service.serviceClient.GetPositionInfo) {
          service.serviceClient.GetPositionInfo({
            'InstanceID': instanceId
          }, function (result) {
            const trackDuration = container.parseDuration(result.TrackDuration);
            if (trackDuration === -1) {
              return;
            }

            const currentTrackPosition = container.parseDuration(result.RelTime);
            if (currentTrackPosition === -1) {
              return;
            }

            const remainingTrackDuration = trackDuration - currentTrackPosition;

            container.playingUntil = new Date();
            container.playingUntil.setSeconds(container.playingUntil.getSeconds() + remainingTrackDuration);

            const scrobbleSongOffset = Math.max(1, trackDuration * 0.8 - currentTrackPosition) * 1000;
            service.scrobbleSongTimeout = setTimeout(container.scrobbleSong, scrobbleSongOffset);

            container.scrobblingAt = new Date();
            container.scrobblingAt.setTime(container.scrobblingAt.getTime() + scrobbleSongOffset);
          });
        }
      });
    }
  });
};

joinUpnpNetwork();