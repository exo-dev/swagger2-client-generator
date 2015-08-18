'use strict';

var createOperationHandler = require('./createOperationHandler');

function createClient(schema, requestHandler){
  var apiAuthData;
  var authMethodName = 'auth';
  var apiObject = {};

  schema = updateSchema(schema);
  // if some model is named auth, we use authorization instead
  Object.keys(schema.paths).some(function(path) {
    if (getModelName(path) === 'auth') {
      authMethodName = 'authorization';
      return true;
    }
  });

  apiObject[authMethodName] = function(){
    if(arguments.length === 0) return apiAuthData;
    apiAuthData = processApiAuthArgs(arguments);
  };

  for (var path in schema.paths) {
    var modelAuthData;
    var declaration = schema.paths[path];
    var model = getModelName(path);

    if (!apiObject[model]) {
      apiObject[model] = {}
      apiObject[model][authMethodName] = function(){
        if(arguments.length === 0) return modelAuthData;
        modelAuthData = processApiAuthArgs(arguments);
      }
    }

    Object.keys(declaration).forEach(function(methodName) {
      var operation = declaration[methodName];
      var operationId = operation.operationId;
      var operationAuthData;

      var getAuthData = function() {
        return operationAuthData || modelAuthData || apiAuthData;
      }
      operation.method = methodName.toUpperCase();

      // Use schema's security definition in case of no operation definition.
      if (typeof operation.security === 'undefined') {
        // If operation's security is defined, it overrides top level security
        operation.security = schema.security;
      }

      var operationHandler = createOperationHandler(operation, schema, getAuthData, requestHandler);
      apiObject[model][operationId] = operationHandler;

      operationHandler[authMethodName]  = function(){
        if(arguments.length === 0) return operationAuthData;
        operationAuthData = processApiAuthArgs(arguments);
      };

    });
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
  for (var path in swaggerJson.paths) {
    var actualPath = swaggerJson.paths[path];
    for (var methodName in actualPath){
      var method = actualPath[methodName];

      method.path = path;
      method.basePath = swaggerJson.schemes[0]+'://'+swaggerJson.host+swaggerJson.basePath;

      method.parameters.forEach(function(parameter) {

        var source = parameter.items || parameter;
        if (source.schema && source.schema.$ref) {
          var $ref = source.schema.$ref;
          var model = $ref.split('/').pop();
          var definition = swaggerJson.definitions[model];

          // This version of swagger validate needs the parameter's type to be defined
          source.type = model;
          source.schema = definition;
        }
      });
    }
  }
  return swaggerJson;
}

function getModelName(path) {
  return path.split('/')[1];
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
