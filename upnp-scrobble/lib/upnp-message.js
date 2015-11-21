var xml2js = require('xml2js');
var xmlParser = new xml2js.Parser({ explicitArray: false });
var objectPath = require('object-path');
var _ = require('underscore');

'use strict';

function getEventMetadata(message, callback) {
  getEventMetadataContent(message, (error, metadata) => {
    if (error) {
      callback(error);
    } else if (metadata) {
      const content = objectPath.get(metadata, '$.val');
      if (_.isString(content)) {
        xmlParser.parseString(content, callback);
      } else {
        callback(new Error('Inner content of child-element "Metadata" of parameter "message" is no string'));
      }
    } else {
      callback(new Error('Parameter "message" has no child-element "Metadata"'));
    }
  });
};

function getEventMetadataContent(message, callback) {
  getEvent(message, (error, event) => {
    if (error) {
      callback(error);
    } else if (event) {
      var metadata = objectPath.get(event, 'InstanceID.Metadata')
        || objectPath.get(event, 'InstanceID.AVTransportURIMetaData');
      callback(null, metadata);
    } else {
      callback(new Error('Paramater "message" has no child element "Event"'));
    }
  });
};

function getEvent(message, callback) {
  getLastChange(message, (error, lastChange) => {
    if (error) {
      callback(error);
    } else if (lastChange) {
      callback(null, lastChange.Event);
    } else {
      callback(new Error('No last change available'));
    }
  });
};

function getLastChange(message, callback) {
  const lastChange = objectPath.get(message, 'body.e:propertyset.e:property.LastChange');
  if (lastChange) {
    xmlParser.parseString(lastChange, callback);
  } else {
    callback(new Error('No last change available'));
  }
};

exports.getLastChange = getLastChange;
exports.getEvent = getEvent;
exports.getEventMetadataContent = getEventMetadataContent;
exports.getEventMetadata = getEventMetadata;