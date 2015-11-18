var config = require("./config.json");
var MediaRendererClient = require("upnp-mediarenderer-client");
var Scribble = require("scribble");
var parseString = require("xml2js").parseString;
var Client = require("node-ssdp").Client;

var scribble = new Scribble(config.lastfm.key,
    config.lastfm.secret,
    config.lastfm.username,
    config.lastfm.password);

var client = new Client();
client.on("response", function (headers, statusCode, rinfo) {
    var st = headers.ST;
    if (st != "urn:schemas-upnp-org:device:MediaRenderer:1") {
        return;
    }

    var location = headers.LOCATION;
    console.log("found: " + location);

    var mediaRendererClient = new MediaRendererClient(location);
    mediaRendererClient.on("status", function (status) {
        parseString(status.AVTransportURIMetaData, function (error, result) {
            console.log(result);

            var play = {
                "artist": result["DIDL-Lite"].item[0]["upnp:artist"][0],
                "track": result["DIDL-Lite"].item[0]["dc:title"][0],
                "album": result["DIDL-Lite"].item[0]["upnp:album"][0]
            };
            scribble.Scrobble(play, function (response) {
                console.log(response);
            });
        });
    });
});
client.search("urn:schemas-upnp-org:device:MediaRenderer:1");