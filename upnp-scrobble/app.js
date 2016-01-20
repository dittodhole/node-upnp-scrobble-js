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
const fs = require('fs');
const pd = require('pretty-data2').pd;
const url = require('url');
const querystring = require('querystring');
const express = require('express');
const exphbs = require('express-handlebars');
const config = require('./config.json');

'use strict';

const app = express();
const hbsConfig = {
  "helpers": {
    "formatXML": function (data) {
      return pd.xml(data);
    },
    "formatTime": function (time) {
      if (time) {
        return new Date(time).toISOString();
      }
      return null;
    }
  }
};
_.extend(hbsConfig.helpers, require('diy-handlebars-helpers'));
const hbs = exphbs.create(hbsConfig);
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.get('/', function (req, res, next) {
  res.render('index', container);
});

var container = {
  "statusPageMeterUpdateIntervalInSeconds": config.statusPageMeterUpdateIntervalInSeconds || 1,
  "statusPageRefreshAfterPlayTimeoutInSeconds": config.statusPageRefreshAfterPlayTimeoutInSeconds || 2,
  "statusPageRefreshRadioTimeoutInSeconds": config.statusPageRefreshRadioTimeoutInSeconds || 60,
  "scribble": new Scribble(config.lastfm.key, config.lastfm.secret, config.lastfm.username, config.lastfm.password),
  "server": http.createServer(app).listen(config.serverPort),
  "peer": null,
  "unhandleService": function (service) {
    console.log('unhandleService', service.USN);

    if (service.clearResetPeerTimeout) {
      service.clearResetPeerTimeout();
    }
    if (service.device.clear) {
      service.device.clearSong();
    }
    service.removeAllListeners('event');
  },
  "getSeconds": function (duration) {
    if (!duration) {
      return 0;
    }

    const parts = duration.split(':');
    const seconds = (+parts[0]) * 60 * 60 + (+parts[1]) * 60 + (+parts[2]);

    return seconds;
  },
  "nowPlaying": function (service, instanceId, song) {
    console.log('nowPlaying', service.USN, song);

    if (!song) {
      return;
    }

    service.serviceClient.GetPositionInfo({
      "InstanceID": instanceId
    }, _.bind(function (result) {
      if (!result.RelTime) {
        return;
      }
      if (result.RelTime === 'NOT_IMPLEMENTED') {
        return;
      }
      if (!result.TrackDuration) {
        return;
      }
      if (result.TrackDuration === 'NOT_IMPLEMENTED') {
        return;
      }

      this.scribble.NowPlaying(song);

      song.duration = result.TrackDuration;
      song.durationInSeconds = this.getSeconds(result.TrackDuration);
      song.positionInSeconds = this.getSeconds(result.RelTime);
      song.timestamp = Date.now();
      song.absoluteScrobbleOffsetInSeconds = song.durationInSeconds * (config.scrobbleFactor || 0.8);
      song.relativeScrobbleOffsetInSeconds = Math.max(1, song.absoluteScrobbleOffsetInSeconds - song.positionInSeconds);

      service.device.clearScrobbleSongTimeout();
      service.device.scrobbleSongTimeout = setTimeout(_.bind(function () {
        console.log('scrobble', service.USN, song);

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

    const resetPeerOffset = this.getRemainingTimeFromTimeout(service.timeoutHandle, service.device.discoveryTime) + 5 * 1000;

    console.log('resetPeerOffset', resetPeerOffset);

    service.resetPeerTimeout = setTimeout(_.bind(this.resetPeer, this), resetPeerOffset);
  },
  "getRemainingTimeFromTimeout": function (timeout, fallbackStartTime) {
    var idleStart = timeout._idleStart;
    if (idleStart < fallbackStartTime) {
      idleStart += fallbackStartTime;
    }

    const idleTimeout = timeout._idleTimeout;
    const remainingTime = idleStart + idleTimeout - Date.now();

    return remainingTime;
  },
  "resetPeer": function () {
    console.log('resetPeer');

    this.clearScanTimeout();

    const that = this;
    _.each(this.peer.remoteDevices, function (remoteDevice) {
      _.each(remoteDevice.services, function (service) {
        that.unhandleService(service);
      });
    });

    if (this.peer) {
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
  },
  "parseSong": function (data) {
    console.log('parseSong', data);

    const song = {
      "artist": objectPath.get(data, 'DIDL-Lite.item.upnp:artist'),
      "track": objectPath.get(data, 'DIDL-Lite.item.dc:title'),
      "album": null,
      "duration": null,
      "albumArtURI": objectPath.get(data, 'DIDL-Lite.item.upnp:albumArtURI._'),
      "durationInSeconds": 0,
      "positionInSeconds": 0,
      "scrobbleOffsetInSeconds": 0,
      "timestamp": Date.now()
    };

    const raumfeldSection = objectPath.get(data, 'DIDL-Lite.item.raumfeld:section');
    if (raumfeldSection === 'SoundCloud') {
      const albumArtUrl = url.parse(song.albumArtURI);
      const albumArtUrlQuerystring = querystring.parse(albumArtUrl.query);
      song.albumArtURI = albumArtUrlQuerystring.playlistId.replace('-large.jpg', '-t300x300.jpg');
    } else if (raumfeldSection === 'RadioTime') {
      song.albumArtURI = objectPath.get(data, 'DIDL-Lite.item.upnp:albumArtURI');

      const trackParts = song.track.split('-');
      song.artist = trackParts[0].trim();
      song.track = _.rest(trackParts).join('-').trim();
      if (!song.track) {
        console.log('parseSong [OUT]', null);
        return null;
      }
    } else {
      song.album = objectPath.get(data, 'DIDL-Lite.item.upnp:album');
    }

    console.log('parseSong [OUT]', song);

    return song;
  }
};

function joinUpnpNetwork() {
  upnp.createPeer({
    "server": container.server
  }).on('ready', function (peer) {
    container.peer = peer;

    peer.on('disappear', container.unhandleService);

    const scanFn = function () {
      console.log('scanFn');

      peer.removeListener(config.serviceType, handleService);
      peer.on(config.serviceType, handleService);

      container.scanTimeout = setTimeout(scanFn, (config.scanIntervalInSeconds || 30) * 1000);
    };
    scanFn();
  }).start();
};

function handleService(service) {
  console.log('handleService', service.USN);

  service.device.discoveryTime = Date.now();
  service.device.song = null;
  service.device.scrobbleSongTimeout = null;
  service.device.clearScrobbleSongTimeout = function () {
    clearTimeout(this.scrobbleSongTimeout);
    this.scrobbleSongTimeout = null;
  };
  service.device.clearSong = function () {
    console.log('clearSong', service.USN);

    this.clearScrobbleSongTimeout();
    this.song = null;
  };
  service.resetPeerTimeout = null;
  service.clearResetPeerTimeout = function () {
    if (this.resetPeerTimeout) {
      clearTimeout(this.resetPeerTimeout);
      this.resetPeerTimeout = null;
    }
  };
  service.eventQueue = {
    "_store": [],
    "_maxLength": config.eventLogMaxLength || 10,
    "enqueue": function (obj) {
      console.log('received event', service.USN, obj);

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
  console.log('handleEvent', service.USN, data);

  container.enqueueResetPeerTimeout(service);

  const complexEvent = {
    "timestamp": Date.now(),
    "change": data.LastChange,
    "event": builder.buildObject(data),
    "transportState": null,
    "metadata": null,
    "instanceId": null
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

    const metadata = objectPath.get(data, 'Event.InstanceID.CurrentTrackMetaData') || objectPath.get(data, 'Event.InstanceID.AVTransportURIMetaData');

    complexEvent.transportState = objectPath.get(data, 'Event.InstanceID.TransportState.val');
    complexEvent.metadata = objectPath.get(metadata, 'val');
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

          const song = container.parseSong(data);

          container.nowPlaying(service, complexEvent.instanceId, song);
        });
      } else {
        container.nowPlaying(service, complexEvent.instanceId, service.device.song);
      }
    } else if (complexEvent.transportState === 'PAUSED_PLAYBACK') {
      service.device.clearSong();
    } else if (complexEvent.transportState === 'NO_MEDIA_PRESENT') {
      service.device.clearSong();
    }
  });
};

joinUpnpNetwork();