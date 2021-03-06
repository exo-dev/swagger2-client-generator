'use strict';
/* global jasmine */
var createOperationHandler = require('./createOperationHandler');

describe('create operation handler', function(){
  var basicOperation,
    complexOperation,
    requestHandler,
    promise,
    authData,
    getAuthData,
    schema;

  beforeEach(function(){
    authData = {};
    schema = {
      definitions: {},
      securityDefinitions: {}
    };

    getAuthData = jasmine.createSpy('getAuthData').and.returnValue(authData);

    promise = {
      then: jasmine.createSpy('promise.then')
    };

    requestHandler = jasmine.createSpy('requestHandler').and.returnValue(promise);
    basicOperation = {
      method: 'GET',
      basePath: 'http://example.com/api',
      path: '/do/it',
      parameters: [
        {
          in: 'query',
          type: 'number',
          name: 'queryParam'
        }
      ]
    };

    complexOperation = {
      method: 'PUT',
      basePath: 'http://example.com/api',
      path: '/do/{what}.{format}',
      consumes: [
        'application/json',
        'multipart/form-data',
        'application/x-www-form-urlencoded',
        'text/plain'
      ],
      produces: ['application/json'],
      parameters: [
        {
          in: 'path',
          type: 'string',
          name: 'pathParam'
        },
        {
          in: 'form',
          type: 'string',
          name: 'formParam'
        },
        {
          in: 'form',
          type: 'string',
          name: 'otherFormParam'
        },
        {
          in: 'body',
          type: 'string',
          name: 'theBody'
        },
        {
          in: 'query',
          type: 'string',
          name: 'queryParam'
        },
        {
          in: 'query',
          type: 'number',
          name: 'queryNumberParam'
        },
        {
          in: 'form',
          type: 'File',
          name: 'theFile'
        }
      ]
    };
  });

  it('returns the result of the request handler regardless of errors', function(){
    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);
    var result = operationHandler();
    expect(requestHandler).toHaveBeenCalled();
    expect(result).toBe(promise);
  });

  it('converts passed value to it\'s corresponding param for one-param operations', function(){
    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);

    operationHandler(1);

    expect(requestHandler).toHaveBeenCalledWith(undefined, jasmine.objectContaining(
      {data: {queryParam: 1}}
    ));
  });


  it('converts passed value to it\'s corresponding param for one-param operations', function(){
    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);

    operationHandler(0);
    expect(requestHandler).toHaveBeenCalledWith(undefined, jasmine.objectContaining(
      {data: {queryParam: 0}}
    ));
  });

  it('doesn\'t convert passed values if they are an object and a key in the object' +
    'corresponds to a param name', function(){
    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);

    operationHandler({ queryParam: 1 });

    expect(requestHandler).toHaveBeenCalledWith(undefined, jasmine.objectContaining(
      {data: {queryParam: 1}}
    ));
  });

  it('prunes unknown params immediately', function(){
    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);

    operationHandler({
      queryParam: 1,
      unkownParamName: 'turn down for what'
    });

    expect(requestHandler).not.toHaveBeenCalledWith(undefined, jasmine.objectContaining(
      {data: { unkownParamName: 'turn down for what' }}
    ));

    expect(requestHandler).toHaveBeenCalledWith(undefined, jasmine.objectContaining(
      {data: {queryParam: 1}}
    ));
  });

  it('provides error types for the operation handler as a property', function(){
    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);

    operationHandler({ queryParam: '1' });
    expect(requestHandler).toHaveBeenCalledWith(
      jasmine.any(operationHandler.errorTypes.ValidationErrors),
      jasmine.any(operationHandler.Request)
    );
  });

  it('provides an operation data validator as a property', function(){
    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);
    expect(operationHandler.validate).toBeDefined();
  });

  it('provides the operation as a property', function(){
    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);
    expect(operationHandler.operation).toBe(basicOperation);
  });

  it('provides the possible error types for the operation as a property', function(){
    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);
    expect(operationHandler.errorTypes).toBeDefined();
  });

  it('provides the Request type for the operation as a property', function(){
    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);
    expect(operationHandler.Request).toBeDefined();

    var otherOperationHandler = createOperationHandler(complexOperation, schema, getAuthData, requestHandler);
    expect(otherOperationHandler.Request).toBeDefined();

    expect(otherOperationHandler.Request).not.toBe(operationHandler.Request);
  });

  it('provides a method to just get the URL for an operation', function(){
    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);
    expect(operationHandler.getUrl).toBeDefined();
    var url = operationHandler.getUrl({queryParam: 1});
    expect(url).toBe('http://example.com/api/do/it?queryParam=1');

    // Invalid data causes an exception to be thrown
    expect(function(){
      operationHandler.getUrl({queryParam: '1'});
    }).toThrow();
  });

  it('calls getAuthData to get the authorization data settings', function(){
    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);
    operationHandler({ queryParam: 1 });
    expect(getAuthData).toHaveBeenCalled();
  });

  it('returns missing auth exceptions when auth params are missing', function(){
    schema = {securityDefinitions: {basicAuth: {type: 'basic'}}};
    basicOperation.security = [{basicAuth: {}}];

    var getAuthData = function(){ return undefined; };

    var operationHandler = createOperationHandler(basicOperation, schema, getAuthData, requestHandler);
    operationHandler({ queryParam: 1 });
    expect(requestHandler).toHaveBeenCalledWith(
      jasmine.any(operationHandler.errorTypes.MissingAuthorizationError),
      jasmine.any(operationHandler.Request)
    );
  });
});
