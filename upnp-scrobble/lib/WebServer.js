﻿'use strict';

const EventEmitter = require('events');
const http = require('http');
const _ = require('underscore');
const express = require('express');
const exphbs = require('express-handlebars');
const socket = require('socket.io');

class WebServer extends EventEmitter {
  constructor(port, dataMap) {
    super();
    this._port = port;
    this._dataMap = dataMap || {};
    this._app = null;
    this._server = null;
    this._io = null;
    this._initialize();
  }
  _initialize() {
    this._app = express();
    this._app.set('view engine', 'hbs');
    this._app.engine('hbs', exphbs());
    this._app.get('/', (request, response) => this._renderView('index', request, response));
    this._app.use(express.static('bower_components'));
    this._server = http.createServer(this._app).listen(this._port);
    this._io = socket(this._server);
    this._io.sockets.on('connection', (socket) => {
      socket.on('getServices', () => this.emit('getServices'));
    });
  }
  _renderView(viewName, request, response) {
    let data = this._dataMap[viewName];
    response.render(viewName, data);
  }
  publish(data) {
    this._io.emit('message', data);
  }
}

module.exports = WebServer;
