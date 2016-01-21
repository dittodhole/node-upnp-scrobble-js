'use strict';

const http = require('http');
const upnp = require('peer-upnp');
const _ = require('underscore');
const builder = new xml2js.Builder();
const objectPath = require('object-path');
const xml2js = require('xml2js');
const xmlParser = new xml2js.Parser({
  "mergeAttrs": true,
  "explicitArray": false,
  "ignoreXmlns": true
});

class PeerClient {
  constructor(port, songParser) {
    this._port = port || 1337;
    this._songParser = songParser;
    this._server = null;
    this._peer = null;
    this._scanTimeout = null;
    this._serviceDiscoveryTimes = new Map();
    this._serviceClients = new Map();
    this._services = new Map();
  };
  attachToServices(serviceType, scanTimeoutInSeconds) {
    this._resetInstance();

    scanTimeoutInSeconds = scanTimeoutInSeconds || 30;

    let server = http.createServer().listen(this._port);
    upnp.createPeer({
      "server": this._server
    }).on('ready', (peer) => {
      this._server = server;
      this._peer = peer;
      this._peer.on('disappear', this._unhandleService);

      this._scanNetwork(serviceType, scanTimeoutInSeconds);
    }).start();
  };
  _resetInstance() {
    if (this._scanTimeout) {
      clearTimeout(this._scanTimeout);
      this._scanTimeout = null;
    }
    if (this._peer) {
      _.each(this._peer.remoteDevices, (remoteDevice) => {
        _.each(remoteDevice.services, this._unhandleService);
      });

      this._peer.close();
      this._peer = null;
    }
    if (this._server) {
      this._server.close();
      this._server = null;
    }
  };
  _scanNetwork(serviceType, scanTimeoutInSeconds) {
    if (!this._peer) {
      return;
    }

    this._peer.removeListener(serviceType, this._handleService);
    this._peer.on(serviceType, this._handleService);

    this._scanTimeout = setTimeout(() => this._scanNetwork(serviceType, scanTimeoutInSeconds), scanTimeoutInSeconds * 1000);
  };
  _handleService(service) {
    this._services.add(service.USN, service);
    this._serviceDiscoveryTimes.add(service.USN, Date.now());

    service.bind((serviceClient) => {
      this._serviceClients.add(service.USN, serviceClient);
    }).on('event', (data) => this._handleEvent(service.USN, data));
  };
  _unhandleService(service) {
    this._services.delete(service.USN);
    this._serviceDiscoveryTimes.delete(service.USN);
    this._serviceClients.delete(service.USN);
    service.removeAllListeners('event');
    // TODO
  };
  _handleEvent(serviceKey, data) {
    let service = this._services.get(serviceKey);
    if (!service) {
      return;
    }

    let complexEvent = {
      "instanceId": null,
      "change": data.LastChange,
      "event": builder.buildObject(data),
      "metadata": null,
      "timestamp": Date.now(),
      "transportState": null
    };

    // TODO send the complexEvent (when completed) to the client

    if (!_.isString(complexEvent.change)) {
      return;
    }

    xmlParser.parseString(complexEvent.change, (error, data) => {
      if (error) {
        return;
      }

      let metadata = objectPath.get(data, 'Event.InstanceID.CurrentTrackMetaData') || objectPath.get(data, 'Event.InstanceID.AVTransportURIMetaData');

      complexEvent.transportState = objectPath.get(data, 'Event.InstanceID.TransportState.val');
      complexEvent.metadata = objectPath.get(metadata, 'val');
      complexEvent.instanceId = objectPath.get(data, 'Event.InstanceID.val');

      if (!complexEvent.transportState
        || complexEvent.transportState === 'PLAYING'
        || complexEvent.transportState === 'TRANSITIONING') {
        if (complexEvent.metadata) {
          xmlParser.parseString(complexEvent.metadata, (error, data) => {
            if (error) {
              return;
            }

            let song = this._songParser.parseSong(data);

            //container.nowPlaying(service, complexEvent.instanceId, song);
          });
        } else {
          //container.nowPlaying(service, complexEvent.instanceId, service.device.song);
        }
      } else if (complexEvent.transportState === 'PAUSED_PLAYBACK') {
        //service.device.clearSong();
      } else if (complexEvent.transportState === 'NO_MEDIA_PRESENT') {
        //service.device.clearSong();
      }
    });
  };
};

module.exports = PeerClient;
