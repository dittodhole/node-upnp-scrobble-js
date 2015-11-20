var Bunyan = require('bunyan');
var SSDP = require('node-ssdp');
var HTTP = require('http');
var URL = require('url');
var Parser = require('xml2js');
//var Subscription = require("node-upnp-subscription");
//var MediaRendererClient = require("upnp-mediarenderer-client");

var config = require('./config.json');

var log = Bunyan.createLogger({
  "name": 'upnp-scrobble',
  "level": config.logLevel
});

/*
var Scribble = require("scribble");
var scribble = new Scribble(config.lastfm.key,
                            config.lastfm.secret,
                            config.lastfm.username,
                            config.lastfm.password);
*/

const serviceType = 'urn:schemas-upnp-org:device:MediaRenderer:1';

function scanNetwork() {
  const client = new SSDP.Client({
    "logLevel": config.logLevel
  });
  client.on('response', handleDevice);
  // TODO remove devices that are not present anymore
  // TODO make the search stable
  client.search(serviceType);
};

var devices = {};

function handleDevice(device) {
  // TODO deal with disconnects and reconnects with different LOCATION
  if (devices.ST !== serviceType) {
    return;
  }
  if (!devices[device.USN]) {
    log.info('found a device:',
      device);

    devices[device.USN] = initializeDevice(device);
  }
};

function initializeDevice(device) {
  // spec: http://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf
  //device.mediaRendererClient = new MediaRendererClient(device.LOCATION);
  //device.mediaRendererClient.on("status", handleStatus);

  //device.subscription = new Subscription(host, port, infoSubUri);
  var location = device.LOCATION;

  HTTP.request(location,
      (response) => parseDeviceDefinition(device,
        response))
    .on('error', (error) => {
      log.error(error,
        'HTTP request to %s failed.',
        location);
    })
    .end();

  /*
  var url = URL.parse(location);

  var hostname = url.hostname;
  var port = url.port;
  */

  return device;
};

function parseDeviceDefinition(device,
                               response) {
  var responseBuffer = [];

  response.on('data', (chunk) => {
    responseBuffer.push(chunk);
  });
  response.on('end', () => {
    var result = responseBuffer.join('')
      .toString();
    Parser.parseString(result, (error,
                                result) => {
      if (error) {
        log.error(error,
          'Parsing result of %s failed.',
          device.LOCATION
        );
        return;
      }
      log.debug('Got response from %s',
        device.LOCATION,
        result);
    });
  });
}

/*
function handleStatus(status) {
    // TODO currently it looks like that only the first STATUS broadcast is received, any subsequent push are somehow swallowed
    if (status.TransportState !== "PLAYING") {
        return;
    }
    
    if (status.hasOwnProperty("AVTransportURIMetadata")) {
        handleMetadata(status.AVTransportURIMetaData);
    }
};

function handleMetadata(metadata) {
    Parser.parseString(metadata, function (error,
                                           result) {
        if (error) {
            log.error(error, "xml parsing error");
        } else {
            var play = parseResult(result);
            if (play) {
                // TODO scrobble occurs immediately - usual experience: scrobble is triggered at around 80% of the position.
                scribble.Scrobble(play, function (response) {
                    log.info({
                        "message": "scrobbled a play",
                        "response": response
                    });
                });
            }
        }
    });
};

const resultParsers = {
    "DIDL-Lite": function (result) {
        var innerResult = result["DIDL-Lite"];
        var item = innerResult.item[0];
        var play = {
            "artist": item["upnp:artist"][0],
            "track": item["dc:title"][0],
            "album": item["upnp:album"][0]
        };
        return play;
    }
};

function parseResult(result) {
    log.debug({
        "message": "trying to find a parser",
        "result": result
    });

    for (let propertyName in result) {
        if (!result.hasOwnProperty(propertyName)) {
            continue;
        }

        if (resultParsers.hasOwnProperty(propertyName)) {
            log.debug({
                "message": "found a parser for property",
                "property": propertyName
            });

            var resultParser = resultParsers[propertyName];
            var play = resultParser(result);

            log.debug({
                "message": "parsed a play",
                "play": play
            });

            return play;
        }
    }

    return null;
};
*/

log.info('Hi');

setInterval(scanNetwork,
  config.scanInterval);

scanNetwork();