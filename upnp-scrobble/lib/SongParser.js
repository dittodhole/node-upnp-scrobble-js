'use strict';

const objectPath = require('object-path');
const url = require('url');
const querystring = require('querystring');

class SongParser {
  parseSong(data) {
    let song = {
      "album": null,
      "albumArtURI": objectPath.get(data, 'DIDL-Lite.item.upnp:albumArtURI._'),
      "artist": objectPath.get(data, 'DIDL-Lite.item.upnp:artist'),
      "duration": null,
      "durationInSeconds": 0,
      "positionInSeconds": 0,
      "timestamp": Date.now(),
      "track": objectPath.get(data, 'DIDL-Lite.item.dc:title')
    };

    this._parseSectionData(data, song);

    return song;
  };
  _parseSectionData(data, song) {
    let raumfeldSection = objectPath.get(data, 'DIDL-Lite.item.raumfeld:section');
    if (raumfeldSection === 'SoundCloud') {
      let albumArtURI = url.parse(song.albumArtURI);
      let query = querystring.parse(albumArtURI.query);
      song.albumArtURI = query.playlistId.replace('-large.jpg', '-t300x300.jpg');
    } else if (raumfeldSection === 'RadioTime') {
      song.albumArtURI = objectPath.get(data, 'DIDL-Lite.item.upnp:albumArtURI');

      let trackParts = song.track.split('-');
      song.artist = trackParts[0].trim();
      song.track = _.rest(trackParts).join('-').trim();
    } else {
      song.album = objectPath.get(data, 'DIDL-Lite.item.upnp:album');
    }
  };
  fillDurationAndPosition(data, song) {
    if (!data.RelTime) {
      return;
    }
    if (data.RelTime === 'NOT_IMPLEMENTED') {
      return;
    }
    if (!data.TrackDuration) {
      return;
    }
    if (data.TrackDuration === 'NOT_IMPLEMENTED') {
      return;
    }

    song.duration = data.TrackDuration;
    song.durationInSeconds = this._getSeconds(data.TrackDuration);
    song.positionInSeconds = this._getSeconds(data.RelTime);
    song.timestamp = Date.now();

    return song;
  };
  _getSeconds(duration) {
    if (!duration) {
      return 0;
    }

    let parts = duration.split(':');
    let seconds = (+parts[0]) * 60 * 60 + (+parts[1]) * 60 + (+parts[2]);

    return seconds;
  };
};

module.exports = SongParser;
