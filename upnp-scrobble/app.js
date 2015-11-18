var Scribble = require("scribble");
var Parser = require("xml2js");
var SSDP = require("node-ssdp");
var MediaRendererClient = require("upnp-mediarenderer-client");

var config = require("./config.json");
var scribble = new Scribble(config.lastfm.key,
    config.lastfm.secret,
    config.lastfm.username,
    config.lastfm.password);

function prettyJson(obj) {
    return JSON.stringify(obj, null, 2);
};

var devices = {};

function scanNetwork() {
    var client = new SSDP.Client();
    client.on("response", function (device) {
        // TODO if the search is stable, no additional check against ST is needed anymore
        var st = device.ST;
        if (st != "urn:schemas-upnp-org:device:MediaRenderer:1") {
            return;
        }

        if (devices[device.LOCATION]) {
            return;
        }

        console.log("found a device: " + prettyJson(device));

        devices[device.LOCATION] = initializeDevice(device);
    });

    // TODO make the search stable
    client.search("urn:schemas-upnp-org:device:MediaRenderer:1");
};

function initializeDevice(device) {
    var mediaRendererClient = new MediaRendererClient(device.LOCATION);
    mediaRendererClient.on("status", function (status) {
        if (status.TransportState !== "PLAYING") {
            return;
        }

        Parser.parseString(status.AVTransportURIMetaData, function (error, result) {
            if (error) {
                console.log("error occured during parsing: " + prettyJson(error));
                return;
            }

            var play = parseResult(result);
            if (!play) {
                return;
            }

            scribble.Scrobble(play, function (response) {
                console.log(response);
            });
            // TODO scrobble occurs immediately - usual experience: scrobble is triggered at around 80% of the position.
        });
    });

    return device;
};

const resultParsers = {
    "DIDL-Lite": function (result) {
        var play = {
            "artist": result.item[0]["upnp:artist"][0],
            "track": result.item[0]["dc:title"][0],
            "album": result.item[0]["upnp:album"][0]
        };
        return play;
    }
};

function parseResult(result) {
    console.log("trying to find a parser for: " + prettyJson(result));

    for (var key in result) {
        if (!result.hasOwnProperty(key)) {
            continue;
        }

        if (resultParsers.hasOwnProperty(key)) {
            var resultParser = resultParsers[key];
            // TODO clarify if we need the inner result for other scenarios, or not ... ? :bomb:
            var innerResult = result[key];
            var play = resultParser(innerResult);

            console.log("parsed to following object: " + prettyJson(play));

            return play;
        }
    }

    return null;
};

console.log("Hi");

const intervalTimeout = 30 * 1000;
setInterval(scanNetwork, intervalTimeout);
scanNetwork();
