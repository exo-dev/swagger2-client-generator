'use strict';

var MissingAuthorizationError = require('./errorTypes').MissingAuthorizationError;

module.exports = function applyAuthData(operation, securityDefinitions, authData, request){

  if(!operation.security || !securityDefinitions) return;

  // TODO: make it work with multiple security requirements
  var authMap = operation.security[0];

  var authNames = Object.keys(authMap).filter(function(authName){
    // Currently unable to handle oauth2
    return securityDefinitions[authName].type !== 'oauth2';
  });

  if(authNames.length === 0) return;

  if(authNames.length === 1){
    var authName = authNames[0];
    var auth = securityDefinitions[authName];
    if(!authData) throw new MissingAuthorizationError(authName, auth);

    // Unpack nested authData for single auth ops: { apiKey: '123' } -> '123'
    if(authData[authName]) authData = authData[authName];
    if(auth.type === 'apiKey'){
      applyApiKey(auth, authName, authData, request);
    } else if(auth.type === 'basic') {
      applyBasicAuth(auth, authName, authData.username, authData.password, request);
    }
  } else {
    var hasAuth = authNames.some(function(authName){
      var auth = authMap[authName];
      var data = authData[authName];

      if(!data) return false;

      if(auth.type === 'apiKey'){
        applyApiKey(auth, authName, data, request);
      } else if(auth.type === 'basic'){
        applyBasicAuth(auth, authName, data.username, data.password, request);
      }

      return true;
    });

    if(!hasAuth){
      throw new MissingAuthorizationError(authNames.join(', '), authMap);
    }
  }
};

function applyApiKey(auth, authName, apiKey, request){
  if(!apiKey) throw new MissingAuthorizationError(authName, auth);

  if(auth.in === 'header'){
    request.headers[auth.name] = apiKey;
  } else if(auth.in === 'query'){
    var url = request.url;
    var queryParam = auth.name + '=' + encodeURIComponent(apiKey);
    if(url.indexOf('?') === -1){
      url += '?' + queryParam;
    } else {
      url = url.replace('?', '?' + queryParam + '&');
    }
    request.url = url;
  }
}

function applyBasicAuth(auth, authName, username, password, request){
  if(!username || !password) throw new MissingAuthorizationError(authName, auth);

  var url = request.url;

  // Only add basic auth once
  if(url.indexOf('@') === -1){
    url = url.replace('://', '://' + username + ':' + password + '@');
  }

  request.url = url;
}
