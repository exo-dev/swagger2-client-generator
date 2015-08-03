'use strict';

var createOperationHandler = require('./createOperationHandler');

function createClient(schema, requestHandler){

  schema = updateSchema(schema);

  var apiObject = {};
  var getAuthData = function(){};

  for (var path in schema.paths){
    var declaration = schema.paths[path];
    for (var method in declaration) {
      var operation = declaration[method];
      var operationId = operation.operationId;
      var model = operation.tags[0];
      apiObject[model] = apiObject[model] || {};
      operation.method = method.toUpperCase();
      var operationHandler = createOperationHandler(operation, getAuthData, requestHandler);
      apiObject[model][operationId] = operationHandler;
    }
  }
  return apiObject;
}
module.exports = createClient;

function processApiAuthArgs(args){
  // for basic auth, allow calls with two args (username, password)
  if(typeof args[0] === 'string' && typeof args[1] === 'string') {
    return {
      username: args[0],
      password: args[1]
    };
  } else {
    return args[0];
  }
}

function updateSchema(swaggerJson){
  var model;
  for (var path in swaggerJson.paths) {
    var methodInUse = swaggerJson.paths[path].get || swaggerJson.paths[path].post || swaggerJson.paths[path].put;
    if (methodInUse.responses['200'] && ('items' in methodInUse.responses['200'].schema || '$ref' in methodInUse.responses['200'].schema)){
      if ('type' in methodInUse.responses['200'].schema)
        model = methodInUse.responses['200'].schema.items['$ref'].split('/').pop();
      else model = methodInUse.responses['200'].schema['$ref'].split('/').pop();
    }
    for (var method in swaggerJson.paths[path]){
      var models = [swaggerJson.definitions[model]];
      swaggerJson.paths[path][method].path = path;
      swaggerJson.paths[path][method].basePath = 'http://'+swaggerJson.host+swaggerJson.basePath;
      swaggerJson.paths[path][method].models = models;
    }
  }
  return swaggerJson;
}

// Takes a path and returns a JavaScript-friendly variable name
function getApiName(name){
  // String non-word characters
  name = name.replace(/\W/g, '/');

  // Turn paths which look/like/this to lookLikeThis
  name = name.replace(/(\w)\/(\w)/g, function(match, p1, p2){
    return p1 + p2.toUpperCase();
  });

  name = name.replace(/\//g, '');

  return name;
}