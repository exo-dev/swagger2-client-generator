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

  authNames.forEach(function(authName) {
    var auth = securityDefinitions[authName];
    var data;

    if (authData) {
      data = (authData[authName]) ? authData[authName] : authData;
    }

    if(!data) throw new MissingAuthorizationError(authName, auth);

    if(auth.type === 'apiKey'){
      applyApiKey(auth, authName, data, request);
    } else if(auth.type === 'basic'){
      applyBasicAuth(auth, authName, data.username, data.password, request);
    }
  });

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
