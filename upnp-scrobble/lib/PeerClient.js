'use strict';

const EventEmitter = require('events');
const http = require('http');
const upnp = require('peer-upnp');
const _ = require('underscore');
const xml2js = require('xml2js');
const builder = new xml2js.Builder();
const objectPath = require('object-path');
const xmlParser = new xml2js.Parser({
  "mergeAttrs": true,
  "explicitArray": false,
  "ignoreXmlns": true
});

class PeerClient extends EventEmitter {
  constructor(songParser, port) {
    super();
    this._songParser = songParser;
    this._port = port || 1337; // TODO in case no value is provided, randomize the port!
    this._server = null;
    this._peer = null;
    this._scanTimeout = null;
    this._serviceDiscoveryTimes = new Map();
    this._serviceClients = new Map();
    this._services = new Map();
  };
  attachToServices(serviceType, scanTimeoutInSeconds) {
    this._resetInstance();

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
    this._peer.on(serviceType, (service) => this._handleService(service));

    this._scanTimeout = setTimeout(() => this._scanNetwork(serviceType, scanTimeoutInSeconds), scanTimeoutInSeconds * 1000);
  };
  _handleService(service) {
    this._services.set(service.USN, service);
    this._serviceDiscoveryTimes.set(service.USN, Date.now());

    service.bind((serviceClient) => {
      this._serviceClients.set(service.USN, serviceClient);
    }).on('event', (data) => this._handleEvent(service.USN, data));
  };
  _unhandleService(service) {
    this._services.delete(service.USN);
    this._serviceDiscoveryTimes.delete(service.USN);
    this._serviceClients.delete(service.USN);
    service.removeAllListeners('event');
    this.emit('stopped', {
      "serviceKey": service.USN
    });
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
      "status": null,
      "timestamp": Date.now(),
      "transportState": null
    };

    // TODO send the complexEvent (when completed) to the client

    if (!_.isString(complexEvent.change)) {
      complexEvent.status = 'Could not parse event.LastChange';
      this.emit('event', complexEvent);
      return;
    }

    xmlParser.parseString(complexEvent.change, (error, data) => {
      if (error) {
        complexEvent.status = error;
        this.emit('event', complexEvent);
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
              comlexEvent.status = error;
              this.emit('event', complexEvent);
              return;
            }

            let song = this._songParser.parseSong(data);
            let serviceClient = this._serviceClients.get(service.USN);
            if (!serviceClient) {
              complexEvent.status = 'Could not get serviceClient';
              this.emit('event', complexEvent);
              return;
            }

            serviceClient.GetPositionInfo({
              "InstanceID": complexEvent.instanceId
            }, (result) => {
              song = this._songParser.fillDurationAndPosition(result, data);
              if (!song) {
                complexEvent.status = 'Song is invalid';
                this.emit('event', complexEvent);
                return;
              }

              this.emit('playing', {
                "serviceKey": service.USN,
                "song": song
              });
              complexEvent.status = 'Playing';
              this.emit('event', complexEvent);
            });
          });
        } else {
          this.emit('playing', {
            "serviceKey": service.USN
          });
        }
      } else if (complexEvent.transportState === 'PAUSED_PLAYBACK') {
        this.emit('stopped', {
          "serviceKey": service.USN
        });
      } else if (complexEvent.transportState === 'NO_MEDIA_PRESENT') {
        this.emit('stopped', {
          "serviceKey": service.USN
        });
      }
    });
  };
  _getRemainingTimeFromSubscriptionTimeout(serviceKey) {
    let service = this._services.get(serviceKey);
    if (!service) {
      return null;
    }

    let serviceDiscoveryTime = this._serviceDiscoveryTimes.get(serviceKey);
    if (!serviceDiscoveryTime) {
      return null;
    }

    let timeout = service.timeoutHandle;
    let idleStart = timeout._idleStart;
    if (idleStart < serviceDiscoveryTime) {
      idleStart += serviceDiscoveryTime;
    }

    let idleTimeout = timeout._idleTimeout;
    let remainingTime = idleStart + idleTimeout - Date.now();

    return remainingTime;
  };
};

module.exports = PeerClient;
