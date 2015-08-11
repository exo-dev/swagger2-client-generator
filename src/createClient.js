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

function selectModel(actualPath){
  var model = null;
  var methodToUse = [actualPath.get, actualPath.post, actualPath.put];
  for (var method in methodToUse){
    var methodInUse = methodToUse[method];
    if (methodInUse){
      for (var httpCode in methodInUse.responses){
        if (methodInUse.responses[httpCode].schema){
          var httpSchema = methodInUse.responses[httpCode].schema;
          if (httpSchema.items || httpSchema.$ref){
            if ('type' in httpSchema) model = httpSchema.items.$ref.split('/').pop();
            else model = httpSchema.$ref.split('/').pop();
            return model;
          }
        }
      }
    }
  }
 return model;
}

function updateSchema(swaggerJson){
  for (var path in swaggerJson.paths) {
    var actualPath = swaggerJson.paths[path];
    var model = selectModel(actualPath);
    for (var method in actualPath){
      actualPath[method].path = path;
      actualPath[method].basePath = swaggerJson.schemes[0] +'://'+swaggerJson.host+swaggerJson.basePath;
      actualPath[method].models = [swaggerJson.definitions[model]];
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