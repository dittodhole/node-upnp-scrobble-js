'use strict';

const http = require('http');
const _ = require('underscore');
const pd = require('pretty-data2').pd;
const express = require('express');
const exphbs = require('express-handlebars');

class WebServer {
  constructor(port, dataMap) {
    this._port = port;
    this._dataMap = dataMap || {};
    this._app = null;
    this._server = null;
    this._initialize();
  };
  _initialize() {
    let hbsConfig = {
      "helpers": {
        "formatXML": (data) => {
          return pd.xml(data);
        },
        "formatTime": (time) => {
          if (time) {
            return new Date(time).toISOString();
          }
          return null;
        }
      }
    };
    _.extend(hbsConfig.helpers, require('diy-handlebars-helpers'));

    this._app = express();
    this._app.set('view engine', 'hbs');
    this._app.engine('hbs', exphbs(hbsConfig));
    this._app.get('/', (request, response) => this._renderView('index', request, response));
    this._server = http.createServer(this._app).listen(this._port);
  };
  _renderView(viewName, request, response) {
    const data = this._dataMap[viewName];
    response.render(viewName, data);
  };
  publish(event) {
    // TODO
  };
};

module.exports = WebServer;
