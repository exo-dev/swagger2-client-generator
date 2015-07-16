var path = require('path');
var fs = require('fs');
var https = require('https');
var http = require('http');
var url = require('url');

var apiDocs = 'http://petstore.swagger.io/v2/swagger.json';
var destination = __dirname + '/swagger.json';

var protocolHandler = (url.parse(apiDocs).protocol === 'https:') ? https : http;

function updateSwaggerJson(err, swaggerJson){
  if (err) return console.error(err);

  destination = path.resolve(process.cwd(), destination);
  fs.writeFileSync(destination, JSON.stringify(swaggerJson));
}

protocolHandler.get(apiDocs, function (res) {
  var data = '';
  res.setEncoding('utf8');
  res.on('data', function (chunk) {
    data += chunk;
  });

  res.on('end', function () {
    try {
      updateSwaggerJson(null, JSON.parse(data));
    } catch (e) {
      updateSwaggerJson(e, data);
    }
  });
}).on('error', updateSwaggerJson);