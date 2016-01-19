const http = require('http');
const upnp = require('peer-upnp');
const _ = require('underscore');
const xml2js = require('xml2js');
const xmlParser = new xml2js.Parser({
  "mergeAttrs": true,
  "explicitArray": false,
  "ignoreXmlns": true
});
const builder = new xml2js.Builder();
const objectPath = require('object-path');
const Scribble = require('scribble');
const handlebars = require('handlebars');
const fs = require('fs');
const pd = require('pretty-data2').pd;
const helpers = require('diy-handlebars-helpers');
const config = require('./config.json');

_.extend(handlebars.helpers, require('diy-handlebars-helpers'));

'use strict';

handlebars.registerHelper('formatXML', function (data) {
  return pd.xml(data);
});
handlebars.registerHelper('formatTime', function (time) {
  if (time) {
    return new Date(time).toISOString();
  }
});

var container = {
  "scribble": new Scribble(config.lastfm.key, config.lastfm.secret, config.lastfm.username, config.lastfm.password),
  "server": http.createServer()
    .on('request', function (req, res) {
      // TODO maybe use express to define routes more easily - but does that work with peer-upnp, which expects a server?
      if (req.url === '/') {
        const source = fs.readFileSync('views/index.hbs', 'utf-8');
        const template = handlebars.compile(source);
        const html = template(container);
        res.writeHead(200, {
            "Content-Type": 'text/html'
        });
        res.write(html);
        res.end();
      }
    }).listen(config.serverPort),
  "peer": null,
  "unhandleService": function (service) {
    if (service.clearResetPeerTimeout){
      service.clearResetPeerTimeout();
    }
    if (service.device.clear) {
      service.device.clearSong();
    }
    service.removeAllListeners('event');
  },
  "getSeconds": function (duration) {
    if (!duration) {
      return -1;
    }

    const parts = duration.split(':');
    const seconds = (+parts[0]) * 60 * 60 + (+parts[1]) * 60 + (+parts[2]);

    return seconds;
  },
  "nowPlaying": function (service, instanceId, song) {
    if (!song) {
      return;
    }

    this.scribble.NowPlaying(song);

    song.durationInSeconds = this.getSeconds(song.duration);

    service.serviceClient.GetPositionInfo({
      "InstanceID": instanceId
    }, _.bind(function (result) {
      if (!result.TrackDuration) {
        return;
      }
      if (result.TrackDuration === 'NOT_IMPLEMENTED') {
        return;
      }
      if (!result.RelTime) {
        return;
      }
      if (result.RelTime === 'NOT_IMPLEMENTED') {
        return;
      }

      song.durationInSeconds = this.getSeconds(result.TrackDuration);
      song.positionInSeconds = this.getSeconds(result.RelTime);
      song.timestamp = Date.now();
      song.absoluteScrobbleOffsetInSeconds = song.durationInSeconds * 0.8;
      song.relativeScrobbleOffsetInSeconds = Math.max(1, song.absoluteScrobbleOffsetInSeconds - song.positionInSeconds);

      service.device.clearScrobbleSongTimeout();
      service.device.scrobbleSongTimeout = setTimeout(_.bind(function () {
        this.scribble.Scrobble(song);
      }, this), song.relativeScrobbleOffsetInSeconds * 1000);

      service.device.song = song;
    }, this));
  },
  "enqueueResetPeerTimeout": function (service) {
    // this timeout kicks in 5 seconds after there should be an
    // incoming event, and is reset if there is one. there should be
    // either an incoming event based on a subscription or
    // as a response to the renewal request.
    // so essentially, this timeout checks if the connection
    // to the subscription of events (of the service) is lost over
    // time or not. if so, it resets peer-upnp completely.

    service.clearResetPeerTimeout();

    const resetPeerOffset = this.getRemainingTimeFromTimeout(service.timeoutHandle, service.initTimestamp) + 5 * 1000;
    service.resetPeerTimeout = setTimeout(_.bind(this.resetPeer, this), resetPeerOffset);
  },
  "getRemainingTimeFromTimeout": function (timeout, fallbackTimestamp) {
    var idleStart = timeout._idleStart;
    if (idleStart < fallbackTimestamp) {
      idleStart += fallbackTimestamp;
    }

    const idleTimeout = timeout._idleTimeout;
    const remainingTime = idleStart + idleTimeout - Date.now();

    return remainingTime;
  },
  "resetPeer": function () {
    this.clearScanTimeout();

    const that = this;
    _.each(this.peer.remoteDevices, function (remoteDevice) {
      _.each(remoteDevice.services, function (service) {
          that.unhandleService(service);
      });
    });

    if (this.peer){
      this.peer.close();
      this.peer = null;
    }

    // forcing a fresh upnp-discovery in 5 seconds (for a clean stack)
    setTimeout(joinUpnpNetwork, 5 * 1000);
  },
  "scanTimeout": null,
  "clearScanTimeout": function () {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }
};

function joinUpnpNetwork() {
  upnp.createPeer({
    "server": container.server
  }).on('ready', function (peer) {
    container.peer = peer;

    peer.on('disappear', container.unhandleService);

    const scanFn = function () {
      peer.removeListener(config.serviceType, handleService);
      peer.on(config.serviceType, handleService);

      container.scanTimeout = setTimeout(scanFn, (config.scanIntervalInSeconds || 30) * 1000);
    };
    scanFn();
  }).start();
};

function handleService(service) {
  service.device.discoveryTime = Date.now();
  service.device.song = null;
  service.device.scrobbleSongTimeout = null;
  service.device.clearScrobbleSongTimeout = function () {
    clearTimeout(this.scrobbleSongTimeout);
    this.scrobbleSongTimeout = null;
  };
  service.device.clearSong = function () {
    this.clearScrobbleSongTimeout();
    this.song = null;
  };
  service.initTimestamp = Date.now();
  service.resetPeerTimeout = null;
  service.clearResetPeerTimeout = function () {
    if (this.resetPeerTimeout) {
      clearTimeout(this.resetPeerTimeout);
      this.resetPeerTimeout = null;
    }
  };
  service.eventQueue = {
    "_store": [],
    "_maxLength": 10,
    "enqueue": function (obj) {
      this._store.push(obj);
      if (this._store.length > this._maxLength) {
        this._store.shift();
      }
    }
  };

  service.serviceClient = null;
  service.bind(function (serviceClient) {
    service.serviceClient = serviceClient;
  }).on('event', function (data) {
    handleEvent(data, service);
  });
};

function handleEvent(data, service) {
  container.enqueueResetPeerTimeout(service);

  const complexEvent = {
    "timestamp": Date.now(),
    "change": data.LastChange,
    "event": builder.buildObject(data),
    "metadata": null
  };
  service.eventQueue.enqueue(complexEvent);

  if (!_.isString(complexEvent.change)) {
    // TODO add logging
    return;
  }

  xmlParser.parseString(complexEvent.change, function (error, data) {
    if (error) {
      // TODO add logging
      return;
    }
    
    complexEvent.transportState = objectPath.get(data, 'Event.InstanceID.TransportState.val');
    complexEvent.metadata = objectPath.get(data, 'Event.InstanceID.CurrentTrackMetaData.val') || objectPath.get(data, 'Event.InstanceID.AVTransportURIMetaData.val');
    complexEvent.instanceId = objectPath.get(data, 'Event.InstanceID.val');

    if (!complexEvent.transportState
      || complexEvent.transportState === 'PLAYING'
      || complexEvent.transportState === 'TRANSITIONING') {
      if (complexEvent.metadata) {
        xmlParser.parseString(complexEvent.metadata, function (error, data) {
          if (error) {
            // TODO add logging
            return;
          }

          const song = {
            "artist": objectPath.get(data, 'DIDL-Lite.item.upnp:artist'),
            "track": objectPath.get(data, 'DIDL-Lite.item.dc:title'),
            "album": objectPath.get(data, 'DIDL-Lite.item.upnp:album') || objectPath.get(data, 'DIDL-Lite.item.upnp:artist'),
            "duration": objectPath.get(data, 'DIDL-Lite.item.res.duration'),
            "albumArtURI": objectPath.get(data, 'DIDL-Lite.item.upnp:albumArtURI._'),
            "durationInSeconds": 0,
            "positionInSeconds": 0,
            "scrobbleOffsetInSeconds": 0,
            "timestamp": Date.now()
          };

          container.nowPlaying(service, complexEvent.instanceId, song);
        });
      } else {
        container.nowPlaying(service, complexEvent.instanceId, service.device.song);
      }
    }
    else if (complexEvent.transportState === 'PAUSED_PLAYBACK') {
      service.device.clearSong();
    }
    else if (complexEvent.transportState === 'NO_MEDIA_PRESENT') {
      service.device.clearSong();
    }
  });
};

joinUpnpNetwork();