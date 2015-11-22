var HTTP = require('http');
var xml2js = require('xml2js');
var xmlParser = new xml2js.Parser({ explicitArray: false });
var objectPath = require('object-path');
var _ = require('underscore');
var Subscription = require('node-upnp-subscription');
var URL = require('url');

'use strict';

function subscribe(location, serviceType, callback, subscriptionTimeoutInSeconds) {
  getService(location, serviceType, (error, service) => {
    if (error) {
      callback(error);
    } else if (service) {
      const url = URL.parse(location);
      const hostname = url.hostname;
      const port = url.port;
      const eventSubUrl = service.eventSubURL;
      const subscription = new Subscription(hostname,
        port,
        eventSubUrl,
        subscriptionTimeoutInSeconds);
      subscription.on('message', (message) => callback(null, message));
      subscription.on('error', callback);
    } else {
      callback(new Error('No service available'));
    }
  });
};

function getService(location, serviceType, callback) {
  getServices(location, (error, serviceList) => {
    if (error) {
      callback(error);
    } else if (serviceList) {
      const service = _.find(serviceList.service, (service) => service.serviceType === serviceType);
      callback(null, service);
    } else {
      callback(new Error('No service list available'));
    }
  });
};

function getServices(location, callback) {
  getDeviceDefinition(location, (error, deviceDefinition) => {
    if (error) {
      callback(error);
    } else if (deviceDefinition) {
      const serviceList = objectPath.get(deviceDefinition, 'root.device.serviceList');
      callback(null, serviceList);
    } else {
      callback(new Error('No device definition available'));
    }
  });
};

function getDeviceDefinition(location, callback) {
  getRawDeviceDefinition(location, (error, rawResult) => {
    if (error) {
      callback(error);
    } else if (rawResult) {
      xmlParser.parseString(rawResult, callback);
    } else {
      callback(new Error('No device definition available'));
    }
  });
};

function getRawDeviceDefinition(location, callback) {
  const request = HTTP.get(location, (response) => {
    var responseBuffer = [];

    response.on('data', (chunk) => responseBuffer.push(chunk));
    response.on('end', () => {
      var rawResult = responseBuffer.join('').toString();

      callback(null, rawResult);
    });
    response.on('error', callback);
  });
  request.on('error', callback);
};

exports.getRawDeviceDefinition = getRawDeviceDefinition;
exports.getDeviceDefinition = getDeviceDefinition;
exports.getServices = getServices;
exports.getService = getService;
exports.subscribe = subscribe;