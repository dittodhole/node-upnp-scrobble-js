var config = require("./config.json");

var Bunyan = require("bunyan");
var log = Bunyan.createLogger({
    "name": "upnp-scrobbler",
    "level": config.logLevel
});


function getLocalAddresses() {
    var localAddresses = [];
    var OS = require("os");
    var interfaces = OS.networkInterfaces();
    Object.keys(interfaces).forEach(function (interface) {
        interfaces[interface].forEach(function (address) {
            if (address.family !== "IPv4") {
                return;
            }
            if (address.internal) {
                return;
            }
            localAddresses.push(address.address);
        });
    });
    return localAddresses;
};

var localAddresses = getLocalAddresses();
log.debug({
    "message": "found following local addresses",
    "localAddresses": localAddresses
});

var Express = require("express");
var express = Express();
// TODO express is used to listen to subscriptions

//var HTTP = require("http");

/*
var Scribble = require("scribble");
var scribble = new Scribble(config.lastfm.key,
                            config.lastfm.secret,
                            config.lastfm.username,
                            config.lastfm.password);
*/

const serviceType = "urn:schemas-upnp-org:device:MediaRenderer:1";
function scanNetwork() {
    var SSDP = require("node-ssdp");
    var client = new SSDP.Client({
        "logLevel": config.logLevel
    });
    client.on("response", handleDevice);
    // TODO remove devices that are not present anymore
    // TODO make the search stable
    client.search(serviceType);
};

var devices = {};
function handleDevice(device) {
    // TODO if the search is stable, no additional check against ST is needed anymore
    var st = device.ST;
    if (st !== serviceType) {
        return;
    }
    
    if (!devices[device.LOCATION]) {
        log.info({
            "message": "found a device",
            "device": device
        });

        devices[device.LOCATION] = initializeDevice(device);
    }
};

function initializeDevice(device) {
    // spec: http://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf
    //var MediaRendererClient = require("upnp-mediarenderer-client");
    //device.mediaRendererClient = new MediaRendererClient(device.LOCATION);
    //device.mediaRendererClient.on("status", handleStatus);

    return device;
};
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
    var Parser = require("xml2js");
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

log.info("Hi");

const intervalTimeout = 30 * 1000;
setInterval(scanNetwork,
            intervalTimeout);

scanNetwork();
