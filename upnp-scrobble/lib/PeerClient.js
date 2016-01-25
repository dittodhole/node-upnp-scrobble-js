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
    this._port = port;
    this._server = null;
    this._peer = null;
    this._scanTimeout = null;
    this._serviceDiscoveryTimes = null;
    this._serviceClients = null;
    this._services = null;
    this._respawnTimeouts = null;
    this._serviceGroups = null;
  }
  attachToServices(serviceType, scanTimeoutInSeconds) {
    this._resetInstance();

    this.on('respawn', () => this.attachToServices(serviceType, scanTimeoutInSeconds));

    let server = http.createServer().listen(this._port);

    upnp.createPeer({
      "server": server
    }).on('ready', (peer) => {
      this._server = server;
      this._peer = peer;
      this._peer.on('disappear', this._unhandleService);

      this._scanNetwork(serviceType, scanTimeoutInSeconds);
    }).start();
  }
  _resetInstance() {
    this.removeAllListeners('respawn');

    if (this._scanTimeout) {
      clearTimeout(this._scanTimeout);
      this._scanTimeout = null;
    }
    if (this._peer) {
      // TODO find a better way (ie without external dependencies) to iterate over objects
      _.each(this._peer.remoteDevices, (remoteDevice) => {
        _.each(remoteDevice.services, (service) => {
          if (!this._services.has(service.USN)) {
            this._unhandleService(service);
          }
        });
      });

      this._peer.close();
      this._peer = null;
    }
    if (this._server) {
      this._server.close();
      this._server = null;
    }

    this._serviceDiscoveryTimes = new Map();
    this._serviceClients = new Map();
    this._services = new Map();
    this._respawnTimeouts = new Map();
    this._serviceGroups = new Map();
  }
  _scanNetwork(serviceType, scanTimeoutInSeconds) {
    if (!this._peer) {
      return;
    }

    this._peer.removeAllListeners(serviceType);
    this._peer.on(serviceType, (service) => this._handleService(service));

    this._scanTimeout = setTimeout(() => this._scanNetwork(serviceType, scanTimeoutInSeconds), scanTimeoutInSeconds * 1000);
  }
  _handleService(service) {
    this._services.set(service.USN, service);
    this._serviceDiscoveryTimes.set(service.USN, Date.now());
    let serviceGroup = this._serviceGroups.get(service.device.serialNumber);
    if (!serviceGroup) {
      serviceGroup = [];
    }
    serviceGroup.push(service.USN);
    this._serviceGroups.set(service.device.serialNumber, serviceGroup);
    service.bind((serviceClient) => {
      this._serviceClients.set(service.USN, serviceClient);
    }).on('event', (data) => this._handleEvent(service.USN, data));
    this.emit('serviceDiscovered', service);
  }
  _resetRespawnTimeout(serviceKey) {
    this._clearRespawnTimeout(serviceKey);
    let remainingTimeFromScriptionTimeout = this._getRemainingTimeFromSubscriptionTimeout(serviceKey);
    if (!remainingTimeFromScriptionTimeout) {
      return;
    }
    let respawnTimeout = setTimeout(() => {
      this.emit('respawn');
    }, remainingTimeFromScriptionTimeout + 10 * 1000);
    this._respawnTimeouts.set(serviceKey, respawnTimeout);
  }
  _clearRespawnTimeout(serviceKey) {
    let timeout = this._respawnTimeouts.get(serviceKey);
    if (timeout) {
      clearTimeout(timeout);
      this._respawnTimeouts.delete(serviceKey);
      timeout = null;
    }
  }
  _getRemainingTimeFromSubscriptionTimeout(serviceKey) {
    let serviceDiscoveryTime = this._serviceDiscoveryTimes.get(serviceKey);
    if (!serviceDiscoveryTime) {
      return null;
    }
    let service = this._services.get(serviceKey);
    if (!service) {
      return null;
    }
    let timeout = service.timeoutHandle;
    if (!timeout) {
      return null;
    }

    let idleStart = timeout._idleStart;
    if (idleStart < serviceDiscoveryTime) {
      idleStart += serviceDiscoveryTime;
    }
    let idleTimeout = timeout._idleTimeout;
    let remainingTime = idleStart + idleTimeout - Date.now();
    return remainingTime;
  }
  _unhandleService(service) {
    service.removeAllListeners('event');
    this._serviceDiscoveryTimes.delete(service.USN);
    this._serviceClients.delete(service.USN);
    this._services.delete(service.USN);
    this._clearRespawnTimeout(service.USN);
    let serviceGroup = this._serviceGroups.get(service.device.serialNumber);
    if (serviceGroup) {
      serviceGroup.remove(service.USN);
      this._serviceGroups.set(service.device.serialNumber, serviceGroup);
    }
    this.emit('serviceDisappeared', {
      "serviceKey": service.USN
    });
  }
  _handleEvent(serviceKey, data) {
    this._resetRespawnTimeout(serviceKey);

    let complexEvent = {
      "instanceId": null,
      "change": data.LastChange,
      "event": builder.buildObject(data),
      "metadata": null,
      "serviceKey": serviceKey,
      "status": null,
      "timestamp": Date.now(),
      "transportState": null
    };

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
        let serviceClient = this._serviceClients.get(serviceKey);
        if (!serviceClient) {
          complexEvent.status = 'Could not get serviceClient';
          this.emit('event', complexEvent);
          return;
        }

        let service = this._services.get(serviceKey);
        if (!service) {
          complexEvent.status = 'Could not get service';
          this.emit('event', complexEvent);
          return;
        }

        let serviceGroup = this._serviceGroups.get(service.device.serialNumber);
        if (serviceGroup) {
          serviceGroup.forEach((serviceKey) => this.emit('stopped', {
            "serviceKey": serviceKey
          }));
        }

        if (complexEvent.metadata) {
          xmlParser.parseString(complexEvent.metadata, (error, data) => {
            if (error) {
              complexEvent.status = error;
              this.emit('event', complexEvent);
              return;
            }

            let song = this._songParser.parseSong(data);

            serviceClient.GetPositionInfo({
              "InstanceID": complexEvent.instanceId
            }, (data) => {
              song = this._songParser.fillDurationAndPosition(data, song);
              if (!song) {
                complexEvent.status = 'Song is invalid';
                this.emit('event', complexEvent);
                return;
              }

              this.emit('playing', {
                "serviceKey": serviceKey,
                "song": song
              });
              complexEvent.status = 'Playing';
              this.emit('event', complexEvent);
            });
          });
        } else {
          serviceClient.GetPositionInfo({
            "InstanceID": complexEvent.instanceId
          }, (data) => {
            let position = this._songParser.fillDurationAndPosition(data, {});
            if (!position) {
              complexEvent.status = 'Song is invalid';
              this.emit('event', complexEvent);
              return;
            }

            this.emit('continue', {
              "serviceKey": serviceKey,
              "position": position
            });
            complexEvent.status = 'Playing';
            this.emit('event', complexEvent);
          });
        }
      } else if (complexEvent.transportState === 'PAUSED_PLAYBACK') {
        this.emit('stopped', {
          "serviceKey": serviceKey
        });
        complexEvent.status = 'Paused';
        this.emit('event', complexEvent);
      } else if (complexEvent.transportState === 'NO_MEDIA_PRESENT') {
        this.emit('stopped', {
          "serviceKey": serviceKey
        });
        complexEvent.status = 'Stopped';
        this.emit('event', complexEvent);
      }
    });
  }
  getServices() {
    let services = Array.from(this._services.values());

    return services;
  }
}

module.exports = PeerClient;
