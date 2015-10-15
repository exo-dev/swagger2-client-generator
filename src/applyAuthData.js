'use strict';

var MissingAuthorizationError = require('./errorTypes').MissingAuthorizationError;

module.exports = function applyAuthData(operation, securityDefinitions, authData, request){

  if(!operation.security || !securityDefinitions) return;

  var results = {};
  var couldAuth = operation.security.some(function(requirement) {
    results.url = request.url;
    results.headers = {};
    return applyRequirement(requirement, securityDefinitions, authData, results);
  });

  if (!couldAuth) {
    var authNames = [];
    operation.security.forEach(function(requirement) {
      authNames.push(Object.keys(requirement).join(','));
    });
    throw new MissingAuthorizationError(authNames.join(' | '), securityDefinitions);
  } else {
    request.url = results.url;
    for (var headerKey in results.headers) {
      request.headers[headerKey] = results.headers[headerKey];
    }
  }
};

function applyRequirement(requirement, definitions, authData, results) {
  var authNames = Object.keys(requirement).filter(function(authName){
    // Currently unable to handle oauth2
    return definitions[authName].type !== 'oauth2';
  });

  if(authNames.length === 0) return true;

  return !authNames.some(function(authName) {
    var auth = definitions[authName];
    var data;

    if (!authData) return true;

    if (auth.type === 'apiKey') {
      data = isObject(authData) ? authData[authName] : authData;
    } else {
      data = (authData[authName]) ? authData[authName] : authData;
    }
    if(!data) return true;

    if (auth.type === 'apiKey') {
      applyApiKey(auth, authName, data, results);
    } else if (auth.type === 'basic') {
      applyBasicAuth(auth, authName, data.username, data.password, results);
    }
  });
}

function applyApiKey(auth, authName, apiKey, results){
  if(!apiKey) throw new MissingAuthorizationError(authName, auth);

  if(auth.in === 'header'){
    results.headers[auth.name] = apiKey;
  } else if(auth.in === 'query'){
    var url = results.url;
    var queryParam = auth.name + '=' + encodeURIComponent(apiKey);
    if(url.indexOf('?') === -1){
      url += '?' + queryParam;
    } else {
      url = url.replace('?', '?' + queryParam + '&');
    }
    results.url = url;
  }
}

function applyBasicAuth(auth, authName, username, password, results){
  if(!username || !password) throw new MissingAuthorizationError(authName, auth);

  var url = results.url;

  // Only add basic auth once
  if(url.indexOf('@') === -1){
    url = url.replace('://', '://' + username + ':' + password + '@');
  }

  results.url = url;
}

function isObject(object) {
  return object !== null && typeof object === 'object';
}
