var Bunyan = require('bunyan');
var SSDP = require('node-ssdp');
var _ = require('underscore');
var objectPath = require('object-path');
var Scribble = require('scribble');

var upnpServiceDiscovery = require('./lib/upnp-service-discovery.js');
var upnpMessage = require('./lib/upnp-message.js');

var config = require('./config.json');

'use strict';

var log = Bunyan.createLogger({
  "name": 'upnp-scrobble',
  "level": config.logLevel
});

function prettyJson(obj) {
  return JSON.stringify(obj, null, 2);
};

function scanNetwork() {
  // TODO make the search stable
  const client = new SSDP.Client({
    "logLevel": config.logLevel
  });
  client.on('response', handleDevice);
  client.search(config.deviceType);
};

var devices = {};

function handleDevice(device) {
  if (device.ST !== config.deviceType) {
    return;
  }

  const storedDevice = devices[device.USN];
  if (!storedDevice || storedDevice.LOCATION !== device.LOCATION) {
    log.info('Adding device',
      device);
    devices[device.USN] = device;
    initializeDevice(device);
  }
};

function initializeDevice(device) {
  upnpServiceDiscovery.subscribe(device.LOCATION, config.serviceType, (error, message) => {
    if (error) {
      log.error(error,
        'Received an error on subscription of service % at %',
        config.serviceType,
        device.LOCATION);
      delete device[device.USN];
    } else if (message) {
      upnpMessage.getEventMetadata(message, (error, metadata) => {
        if (error) {
          log.warn(error,
            'Parameter "message" has no child-element "Metadata"',
            prettyJson(message));
        } else if (metadata) {
          const play = {
            'artist': objectPath.get(metadata, 'DIDL-Lite.item.upnp:artist'),
            'track': objectPath.get(metadata, 'DIDL-Lite.item.dc:title'),
            'album': objectPath.get(metadata, 'DIDL-Lite.item.upnp:album')
          };
          if (!_.isEqual(device.lastPlay, play)) {
            device.lastPlay = play;

            // TODO scrobble occurs immediately - usual experience: scrobble is triggered at around 80% of the position.
            const scribble = new Scribble(config.lastfm.key,
              config.lastfm.secret,
              config.lastfm.username,
              config.lastfm.password);
            scribble.Scrobble(device.lastPlay, (response) => log.info('scrobbled a play', response));
          }
        } else {
          log.warn('Parameter "message" has no child-element "Metadata"',
            prettyJson(message));
        }
      });
    } else {
      log.warn('Received empty metadata',
        prettyJson(message));
    }
  }, config.subscriptionTimeoutInSeconds);
};

log.info('Hi');

// unhandled exceptions should be handled by FOREVER, restarting the app
//process.on('uncaughtException', (error) => log.error(error));

if (config.devices) {
  config.devices.forEach((device) => handleDevice(device));
} else {
  setInterval(scanNetwork,
    config.scanInterval);

  scanNetwork();
}