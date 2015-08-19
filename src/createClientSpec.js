'use strict';
/* global jasmine */

var createClient = require('./createClient');

describe('create client', function(){
  var schema,
    promise,
    requestHandler;

  beforeEach(function(){
    promise = {
      then: jasmine.createSpy('promise.then')
    };

    requestHandler = jasmine.createSpy('requestHandler').and.returnValue(promise);

    schema = {
      host: 'example.com',
      basePath: '/api',
      schemes: ['http'],
      paths: {
        '/resource/all-of-it': {
          get: {
            operationId: 'doIt',
            parameters: [{
              name: 'queryParam',
              in: 'query',
              type: 'string'
            }]
          }
        }
      },
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          in: 'query',
          name: 'token'
        },
        basicAuth: {
          type: 'basic',
          in: 'query'
        }
      },
      definitions: {
        Model: {properties: {
          id: {type: 'string'}
        }}
      }
    };
  });

  it('uses the resource path if it\'s available for the api name', function(){
    var client = createClient(schema, requestHandler);
    expect(client.resource).toBeDefined();
  });

  it('uses the operation id for the operation name', function(){
    var client = createClient(schema, requestHandler);
    expect(client.resource.doIt).toBeDefined();
  });

  it('uses globally defined type if $ref is used', function() {
    schema.paths['/resource/all-of-it'].get.parameters[0] = {
      schema: {$ref: '#/definitions/Model'},
    };
    var client = createClient(schema, requestHandler);
    expect(client.resource.doIt.operation.parameters[0].type).toBe('Model');
  });

  it('has the ability to set auth at many levels', function(){
    var client = createClient(schema, requestHandler);

    expect(function(){
      client.auth('api-level-auth');
      client.resource.auth('resource-level-auth');
      client.resource.doIt.auth('operation-level-auth');
    }).not.toThrow();
  });

  it('uses "authorize" instead of "auth" for the auth method name if the api already' +
    'makes use of "auth" in the schema', function(){
    schema.paths['/auth'] = {};
    var client = createClient(schema, requestHandler);
    expect(client.auth).toBeDefined();
    expect(client.authorization).toBeDefined();
  });

  it('provides the most specific auth data passed in to it (api-level)', function(){
    schema.paths['/resource/all-of-it'].get.security = [{apiKey: {}}];
    var client = createClient(schema, requestHandler);

    client.auth('api-level-auth');
    client.resource.doIt('1');
    expect(requestHandler.calls.mostRecent().args[1].url)
      .toBe('http://example.com/api/resource/all-of-it?token=api-level-auth&queryParam=1');
  });

  it('provides the most specific auth data passed in to it (model-level)', function(){
    schema.paths['/resource/all-of-it'].get.security = [{apiKey: {}}];
    var client = createClient(schema, requestHandler);

    client.auth('api-level-auth');
    client.resource.auth('model-level-auth');
    client.resource.doIt('1');
    expect(requestHandler.calls.mostRecent().args[1].url)
      .toBe('http://example.com/api/resource/all-of-it?token=model-level-auth&queryParam=1');
  });

  it('provides the most specific auth data passed in to it (op-level)', function(){
    schema.paths['/resource/all-of-it'].get.security = [{apiKey: {}}];
    var client = createClient(schema, requestHandler);

    client.auth('api-level-auth');
    client.resource.auth('resource-level-auth');
    client.resource.doIt.auth('operation-level-auth');
    client.resource.doIt('1');
    expect(requestHandler.calls.mostRecent().args[1].url)
      .toBe('http://example.com/api/resource/all-of-it?token=operation-level-auth&queryParam=1');
  });

  it('provides username and password for basic authentication', function(){
    schema.paths['/resource/all-of-it'].get.security = [{basicAuth: {}}];
    var client = createClient(schema, requestHandler);

    client.auth('john_doe', 'secret');
    client.resource.doIt('1');
    expect(requestHandler.calls.mostRecent().args[1].url)
      .toBe('http://john_doe:secret@example.com/api/resource/all-of-it?queryParam=1');
  });


});
