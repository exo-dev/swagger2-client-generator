'use strict';

var createOperationHandler = require('./createOperationHandler');

function createClient(schema, requestHandler){
  var apiAuthData;
  var authMethodName = 'auth';
  var apiObject = {};

  var basePath = schema.schemes[0] + '://' + schema.host + schema.basePath;

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

      operation.path = path;
      operation.basePath = basePath;
      operation.method = methodName.toUpperCase();

      operation.parameters.forEach(function(parameter) {

        var source = parameter.items || parameter;
        if (source.schema && source.schema.$ref) {
          var $ref = source.schema.$ref;
          var model = $ref.split('/').pop();
          var definition = schema.definitions[model];

          // This version of swagger validate needs the parameter's type to be defined
          source.type = model;
          source.schema = definition;
        }
      });

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

function getModelName(path) {
  return path.split('/')[1];
}
