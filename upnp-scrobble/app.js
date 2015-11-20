'use strict';

var Bunyan = require('bunyan');
var SSDP = require('node-ssdp');
var HTTP = require('http');
var URL = require('url');
var xml2js = require('xml2js');
var xmlParser = new xml2js.Parser({ explicitArray: false });
var Subscription = require('node-upnp-subscription');
var _ = require('underscore');
var Scribble = require('scribble');

var config = require('./config.json');

var log = Bunyan.createLogger({
  "name": 'upnp-scrobble',
  "level": config.logLevel
});

const mediaRendererServiceType = 'urn:schemas-upnp-org:device:MediaRenderer:1';
const avTransportServiceType = 'urn:schemas-upnp-org:service:AVTransport:1';

function scanNetwork() {
  // TODO remove devices that are not present anymore
  // TODO make the search stable
  const client = new SSDP.Client({
    "logLevel": config.logLevel
  });
  client.on('response', handleDevice);
  client.search(mediaRendererServiceType);
};

var devices = {};

function handleDevice(device) {
  // TODO deal with disconnects and reconnects with different LOCATION
  if (device.ST !== mediaRendererServiceType) {
    return;
  }
  if (!devices[device.USN]) {
    log.info('Found a device',
      device);

    devices[device.USN] = initializeDevice(device);
  }
};

function initializeDevice(device) {
  HTTP.request(device.LOCATION, (response) => parseDeviceDefinition(device,
      response))
    .on('error', (error) => {
      log.error(error,
        'HTTP request to %s failed.',
        device.LOCATION);
    })
    .end();

  return device;
};

function parseDeviceDefinition(device,
                               response) {
  var responseBuffer = [];

  response.on('data', (chunk) => responseBuffer.push(chunk));
  response.on('end', () => {
    var rawResult = responseBuffer.join('')
      .toString();

    xmlParser.parseString(rawResult, (error,
                                      result) => {
      if (error) {
        log.error(error,
          'Parsing result of %s failed.',
          device.LOCATION,
          response);
        return;
      }

      var service = _.find(result.root.device.serviceList.service, (device) => device.serviceType === avTransportServiceType);
      if (!service) {
        log.error('Could not find a service of type %s at %s',
          avTransportServiceType,
          device.LOCATION,
          result);
        return;
      }

      device.scribble = new Scribble(config.lastfm.key,
        config.lastfm.secret,
        config.lastfm.username,
        config.lastfm.password);

      var url = URL.parse(device.LOCATION);

      var hostname = url.hostname;
      var port = url.port;
      var eventSubUrl = service.eventSubURL;

      device.subscription = new Subscription(hostname,
        port,
        eventSubUrl);
      device.subscription.on('message', (message) => processMessageFromDevice(device,
        message));
      device.subscription.on('subscribed', (headers) => log.info('Subscribed for events at device',
        url.hostname,
        headers));
      device.subscription.on('resubscribed', (headers) => log.info('Resubscribed for events at device',
        url.hostname,
        headers));
      device.subscription.on('unsubscribed', (headers) => log.info('Unsubscribed for events at device',
        url.hostname,
        headers));
    });
  });
};

function processMessageFromDevice(device,
                                  message) {
  var property = message.body['e:propertyset']['e:property'];
  if (!property) {
    log.error('Received a message from device, but did not contain a property',
      device,
      message);
    return;
  }

  const lastChange = property.LastChange;
  if (!lastChange) {
    log.error('Received a message from device, but did not contain a LastChange',
      device,
      message,
      property);
    return;
  }

  xmlParser.parseString(lastChange, function (error, result) {
    if (error) {
      log.error('Tried to parse message from device, but failed',
        device,
        message,
        property);
      return;
    }

    const event = result.Event;
    if (!event) {
      log.error('Received a message from device, but did not contain Event',
        device,
        message,
        result);
      return;
    }

    const propertyNames = [
      'Uri',
      'Metadata',
      'AVTransportURIMetaData'
    ];

    var metadataSource = event.InstanceID || event;

    const metadataPropertyName = _.find(propertyNames, (propertyName) => metadataSource[propertyName] !== undefined);
    if (!metadataPropertyName) {
      log.error('Received message from device, but did not contain Metadata',
        device,
        result,
        event);
      return;
    }

    const metadata = metadataSource[metadataPropertyName];

    handleMetadata(device,
      metadata);
  });
};

function handleMetadata(device,
                        metadata) {
  const dollar = metadata['$'];
  if (dollar) {
    metadata = dollar.val || metadata;
  }

  xmlParser.parseString(metadata, function (error,
                                            result) {
    if (error) {
      log.error(error,
        'XML parsing error',
        metadata);
      return;
    }

    const lastPlay = parseResult(result);
    if (!lastPlay) {
      log.error('Tried to parse a play from result, but failed',
        device,
        result);
      return;
    }

    if (_.isEqual(device.lastPlay,
      lastPlay)) {
      log.debug('Received a duplicate Event',
        device,
        lastPlay,
        result);
      return;
    }

    device.lastPlay = lastPlay;

    // TODO scrobble occurs immediately - usual experience: scrobble is triggered at around 80% of the position.
    device.scribble.Scrobble(device.lastPlay, (response) => log.info('scrobbled a play',
      response));
  });
};

const resultParsers = {
  "DIDL-Lite": function (result) {
    const innerResult = result['DIDL-Lite'];
    const item = innerResult.item;
    const play = {
      "artist": item['upnp:artist'],
      "track": item['dc:title'],
      "album": item['upnp:album']
    };
    return play;
  }
};

function parseResult(result) {
  const resultParser = _.keys(resultParsers)
    .find((propertyName) => {
      return _.has(result,
        propertyName);
    });
  if (!resultParser) {
    log.error('Tried to find parser, but failed',
      result,
      resultParsers);
    return null;
  }

  const play = resultParsers[resultParser](result);
  return play;
};

process.on('uncaughtException', function (error) {
  log.error(error,
    'unhandled excpetion occured, sending UNSUBSCRIBE to all devices');
  devices.forEach((device) => {
    if (device.subscription) {
      device.subscription.unsubscribe();
    }
  });
});
process.on('exit', function () {
  devices.forEach((device) => {
    if (device.subscription) {
      device.subscription.unsubscribe();
    }
  });
});

log.info('Hi');

if (config.devices) {
  config.devices.forEach((device) => handleDevice(device));
} else {
  setInterval(scanNetwork,
    config.scanInterval);

  scanNetwork();
}