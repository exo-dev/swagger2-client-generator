'use strict';

var applyAuthData = require('./applyAuthData');

describe('apply auth data', function(){
  var request, basicDefinitions, complexDefinitions;

  beforeEach(function(){
    request = {
      url: 'http://example.com?param=value',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'Hello, world'
    };
    basicDefinitions = {
      apiKey: {
        type: 'apiKey',
        name: 'apiToken',
        in: 'query'
      }
    };
    complexDefinitions = {
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

    applyAuthData(operation, basicDefinitions, '123', request);
    expect(request.url).toBe('http://example.com?apiToken=123&param=value');
  });

  it('throws a missing auth error if required auth params are not present', function(){
    var operation = {
      security: [{
        apiKey: {}
      }]
    };

    expect(function(){
      applyAuthData(operation, basicDefinitions, undefined, request);
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

    expect(function(){
      applyAuthData(operation, complexDefinitions, authData, request);
    }).not.toThrow();
  });

  it('can apply apikeys to headers', function(){
    var operation = {
      security: [{
        apiKeyHeader: {}
      }]
    };

    applyAuthData(operation, complexDefinitions, '123', request);
    expect(request.headers).toEqual({
      'Content-Type': 'text/plain',
      'headerToken': '123'
    });
  });

  it('can apply basic auth to urls', function(){
    var operation = {
      security: [{
        basicAuth: {}
      }]
    };
    var authData = {basicAuth: {username: 'Bob', password: 'secret' }};
    basicDefinitions.basicAuth = {type: 'basic'};

    applyAuthData(operation, basicDefinitions, authData, request);
    expect(request.url).toEqual('http://Bob:secret@example.com?param=value');
  });

  it('can apply multiple auths to a request', function() {

    var operation = {
      security: [{
        basicAuth: {},
        apiKeyHeader: {},
        apiKeyQuery: {}
      }]
    };

    applyAuthData(operation, complexDefinitions, {
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

  it('applies the first successful security requirement', function() {

    var operation = {
      security: [{
        basicAuth: {},
        apiKeyQuery: {}
      }, {
        basicAuth: {},
        apiKeyHeader: {}
      }]
    };

    applyAuthData(operation, complexDefinitions, {
      basicAuth: {username: 'Bob', password: 'secret' },
      apiKeyHeader: 'header'
    }, request);

    expect(request.url).toEqual('http://Bob:secret@example.com?param=value');
    expect(request.headers).toEqual({
      'Content-Type': 'text/plain',
      'headerToken': 'header'
    });
  });


  it('fails if can not apply any of the requirements', function() {

    var operation = {
      security: [{
        basicAuth: {},
        apiKeyQuery: {}
      }, {
        apiKeyHeader: {},
        apiKeyQuery: {}
      }, {
        apiKeyQuery: {}
      }]
    };


    expect(function(){
      applyAuthData(operation, complexDefinitions, {
        basicAuth: {username: 'Bob', password: 'secret' },
        apiKeyHeader: 'header'
      }, request);
    }).toThrow();

  });


});
