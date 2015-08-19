'use strict';

var applyAuthData = require('./applyAuthData');

describe('apply auth data', function(){
  var request, securityDefinitions;

  beforeEach(function(){
    request = {
      url: 'http://example.com?param=value',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'Hello, world'
    };
    securityDefinitions = {
      apiKey: {
        type: 'apiKey',
        name: 'apiToken',
        in: 'query'
      }
    };
  });

  it('doesn\'t change the request if there is no auth for the op', function(){
    var noAuthOperation = {
      security: {}
    };

    applyAuthData(noAuthOperation, undefined, request);

    expect(request.url).toBe('http://example.com?param=value');
    expect(request.headers).toEqual({'Content-Type': 'text/plain'});
    expect(request.body).toBe('Hello, world');
  });

  it('always uses the op-level auth and the security definitions', function(){
    var operation = {
      security: [{
        apiKey: {}
      }]
    };

    applyAuthData(operation, securityDefinitions, '123', request);
    expect(request.url).toBe('http://example.com?apiToken=123&param=value');
  });

  it('throws a missing auth error if required auth params are not present', function(){
    var operation = {
      security: [{
        apiKey: {}
      }]
    };

    expect(function(){
      applyAuthData(operation, securityDefinitions, undefined, request);
    }).toThrow();
  });

  it('does not throw a missing auth error if only one of many auth methods present', function(){
    var operation = {
      security: [
        {basicAuth: {}},
        {apiKey: {}}
      ]
    };
    var authData = {basicAuth: {username: 'Bob', password: 'secret' }};

    securityDefinitions.basicAuth = {type: 'basic'}

    expect(function(){
      applyAuthData(operation, securityDefinitions, authData, request);
    }).not.toThrow();
  });

  it('can apply apikeys to headers', function(){
    var operation = {
      security: [{
        apiKey: {}
      }]
    };

    securityDefinitions.apiKey.in = 'header';

    applyAuthData(operation, securityDefinitions, '123', request);
    expect(request.headers).toEqual({
      'Content-Type': 'text/plain',
      'apiToken': '123'
    });
  });

  it('can apply basic auth to urls', function(){
    var operation = {
      security: [{
        basicAuth: {}
      }]
    };
    var authData = {basicAuth: {username: 'Bob', password: 'secret' }};
    securityDefinitions.basicAuth = {type: 'basic'};

    applyAuthData(operation, securityDefinitions, authData, request);
    expect(request.url).toEqual('http://Bob:secret@example.com?param=value');
  });

  // TODO: refactor the test to swagger 2.0 security spec and make the code fulfill it
  it('can apply multiple auths to a request', function() {
    var securityDefinitions = {
      basicAuth: {
        type: 'basic',
      },
      apiKeyHeader: {
        type: 'apiKey',
        name: 'headerToken',
        in: 'header'
      },
      apiKeyQuery: {
        type: 'apiKey',
        name: 'queryToken',
        in: 'query'
      }
    };
    var operation = {
      security: [{
        basicAuth: {},
        apiKeyHeader: {},
        apiKeyQuery: {}
      }]
    };

    applyAuthData(operation, securityDefinitions, {
      basicAuth: {username: 'Bob', password: 'secret' },
      apiKeyQuery: 'query',
      apiKeyHeader: 'header'
    }, request);

    expect(request.url).toEqual('http://Bob:secret@example.com?queryToken=query&param=value');
    expect(request.headers).toEqual({
      'Content-Type': 'text/plain',
      'headerToken': 'header'
    });
  });
});
