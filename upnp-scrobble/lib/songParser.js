'use strict';

const objectPath = require('object-path');
const url = require('url');
const querystring = require('querystring');

class SongParser {
  parseSong(data) {
    let song = {
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

    this._parseSectionData(data, song);

    return song;
  };
  _parseSectionData(data, song) {
    let raumfeldSection = objectPath.get(data, 'DIDL-Lite.item.raumfeld:section');
    if (raumfeldSection === 'SoundCloud') {
      let albumArtUrl = url.parse(song.albumArtURI);
      let albumArtUrlQuerystring = querystring.parse(albumArtUrl.query);
      song.albumArtURI = albumArtUrlQuerystring.playlistId.replace('-large.jpg', '-t300x300.jpg');
    } else if (raumfeldSection === 'RadioTime') {
      song.albumArtURI = objectPath.get(data, 'DIDL-Lite.item.upnp:albumArtURI');

      let trackParts = song.track.split('-');
      song.artist = trackParts[0].trim();
      song.track = _.rest(trackParts).join('-').trim();
    } else {
      song.album = objectPath.get(data, 'DIDL-Lite.item.upnp:album');
    }
  };
  getSeconds(duration) {
    if (!duration) {
      return 0;
    }

    let parts = duration.split(':');
    let seconds = (+parts[0]) * 60 * 60 + (+parts[1]) * 60 + (+parts[2]);

    return seconds;
  };
};

module.exports = SongParser;
