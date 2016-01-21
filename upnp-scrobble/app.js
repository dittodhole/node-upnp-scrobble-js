'use strict';

/*
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
*/

const config = require('./config.json');

const WebServer = require('./lib/WebServer');
const webServer = new WebServer(config.webServerPort);

const SongStorage = require('./lib/SongStorage');
const songStorage = new SongStorage();

const Scribble = require('scribble');
const scribble = new Scribble(config.lastfm.key, config.lastfm.secret, config.lastfm.username, config.lastfm.password);

const serviceClients = new Map();

/*
var container = {
  "unhandleService": function (service) {
    if (service.clearResetPeerTimeout) {
      service.clearResetPeerTimeout();
    }
    if (service.device.clear) {
      service.device.clearSong();
    }
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
};

function handleService(service) {
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
};
*/
