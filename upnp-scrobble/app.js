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

const config = require('./config.json');

'use strict';

handlebars.registerHelper('formatXML', function (data) {
  return pd.xml(data);
});

var container = {
  "scribble": new Scribble(config.lastfm.key, config.lastfm.secret, config.lastfm.username, config.lastfm.password),
  "server": http.createServer()
    .on('request', function (req, res) {
      if (req.url !== '/') {
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
    service.clearSong();
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
  "nowPlaying": function (service, instanceId) {
    const song = service.device.song;
    if (!song) {
      return;
    }

    this.scribble.NowPlaying(song);

    song.durationInSeconds = this.getSeconds(song.duration);

    service.serviceClient.GetPositionInfo({
      "InstanceID": instanceId
    }, function (result) {
      song.durationInSeconds = this.getSeconds(result.TrackDuration);
      song.positionInSeconds = this.getSeconds(result.RelTime);
      song.timestamp = Date.now();
      song.absoluteScrobbleOffsetInSeconds = song.durationInSeconds * 0.8;
      song.relativeScrobbleOffsetInSeconds = Math.max(1, song.absoluteScrobbleOffsetInSeconds - song.positionInSeconds);

      service.clearScrobbleSongTimeout();
      service.scrobbleSongTimeout = setTimeout(function () {
        this.scribble.Scrobble(song);
      }, song.relativeScrobbleOffsetInSeconds * 1000);
    });
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

      container.scanTimeout = setTimeout(scanFn, config.scanInterval || 30 * 1000);
    };
    scanFn();
  }).start();
};

function handleService(service) {
  service.clearScrobbleSongTimeout = function () {
    clearTimeout(service.scrobbleSongTimeout);
    service.scrobbleSongTimeout = null;
  }
  service.clearSong = function () {
    service.clearScrobbleSongTimeout();
    service.device.song = null;
  };

  service.eventQueue = {
    "_store": [],
    "_maxLength": 8,
    "enqueue": function (obj) {
      this._store.push(obj);
      if (this._store.length > this._maxLength) {
        this._store.shift();
      }
    }
  };

  service.bind(function (serviceClient) {
    service.serviceClient = serviceClient;
  }).on('event', function (data) {
    handleEvent(data, service);
  });
};

function handleEvent(data, service) {
  const complexEvent = {
    "timestamp": Date.now(),
    "change": null,
    "event": builder.buildObject(data),
    "metadata": null
  };
  service.eventQueue.enqueue(complexEvent);

  const lastChange = data.LastChange;
  if (!_.isString(lastChange)) {
    // TODO add logging
    return;
  }

  complexEvent.change = lastChange;

  xmlParser.parseString(lastChange, function (error, data) {
    if (error) {
      // TODO add logging
      return;
    }

    complexEvent.transportState = objectPath.get(data, 'Event.InstanceID.TransportState.val');
    complexEvent.metadata = objectPath.get(data, 'Event.InstanceID.AVTransportURIMetaData.val');
    complexEvent.instanceId = objectPath.get(data, 'Event.InstanceID.val');

    if (!complexEvent.transportState
      || complexEvent.transportState === 'PLAYING') {
      if (complexEvent.metadata) {
        
        xmlParser.parseString(complexEvent.metadata, function (error, data) {
          if (error) {
            // TODO add logging
            return;
          }

          service.device.song = {
            "artist": objectPath.get(data, 'DIDL-Lite.item.upnp:artist'),
            "track": objectPath.get(data, 'DIDL-Lite.item.dc:title'),
            "album": objectPath.get(data, 'DIDL-Lite.item.upnp:album'),
            "duration": objectPath.get(data, 'DIDL-Lite.item.res.duration'),
            "albumArtURI": objectPath.get(data, 'DIDL-Lite.item.upnp:albumArtURI._'),
            "durationInSeconds": 0,
            "positionInSeconds": 0,
            "scrobbleOffsetInSeconds": 0,
            "timestamp": Date.now()
          };

            container.nowPlaying(service, complexEvent.instanceId);
        });
      } else {
          container.nowPlaying(service, complexEvent.instanceId);
      }
    }
    else if (complexEvent.transportState === 'PAUSED_PLAYBACK') {
      service.clearSong();
    }
    else if (complexEvent.transportState === 'NO_MEDIA_PRESENT') {
      service.clearSong();
    }
  });
};

joinUpnpNetwork();