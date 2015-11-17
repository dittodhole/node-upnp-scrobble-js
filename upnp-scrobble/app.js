var config = require("./config.json");
var upnpClient = require("node-upnp-client");
var cli = new upnpClient();
cli.searchDevices();
cli.on("searchDevicesEnd", function () {
    console.log("Servers" + JSON.stringify(cli._renderers));
});
//var Scribble = require("scribble");
//var MediaRendererClient = require('upnp-mediarenderer-client');
//urn:schemas-upnp-org:device:MediaRenderer:1

//var scribble = new Scribble(config.lastfm.key,
//                            config.lastfm.secret,
//                            config.lastfm.username,
//                            config.lastfm.password);

console.log("Hello world");