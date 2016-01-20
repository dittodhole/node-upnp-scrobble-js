var http = require('http');
var _ = require('underscore');
var pd = require('pretty-data2').pd;
var express = require('express');
var exphbs = require('express-handlebars');

function webServer(port, dataMap) {
  var hbsConfig = {
    helpers: {
      formatXML: function (data) {
        return pd.xml(data);
      },
      formatTime: function (time) {
        if (time) {
          return new Date(time).toISOString();
        }
        return null;
      }
    }
  };
  _.extend(hbsConfig.helpers, require('diy-handlebars-helpers'));

  var app = express();
  app.set('view engine', 'hbs');
  app.engine('hbs', exphbs(hbsConfig));
  app.get('/', function (request, response) {
    var viewName = 'index';
    var data = dataMap[viewName];
    response.render('index', data);
  });

  http.createServer(app).listen(port || 8080);

  return this;
};

module.exports = webServer;