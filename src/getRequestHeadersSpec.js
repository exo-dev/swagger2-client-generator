'use strict';

var getRequestHeaders = require('./getRequestHeaders');

describe('get request headers', function(){
  var basicOperation,
    complexOperation;

  beforeEach(function(){
    basicOperation = {
      basePath: 'http://example.com/api',
      path: '/do/it',
      parameters: [
        {
          in: 'query',
          type: 'string',
          name: 'queryParam'
        }
      ]
    };

    complexOperation = {
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
          in: 'formData',
          type: 'string',
          name: 'formParam'
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
          in: 'formData',
          type: 'File',
          name: 'theFile'
        }
      ]
    };
  });

  it('sets the default accept header to json', function(){
    var headers = getRequestHeaders(
      basicOperation,
      {}
    );

    expect(headers).toEqual({'Accept': 'application/json'});
  });

  it('allows for the explicit specification of the accept header', function(){
    var headers = getRequestHeaders(
      basicOperation,
      {},
      { accept: 'text/plain' }
    );

    expect(headers).toEqual({'Accept': 'text/plain'});
  });

  it('doesn\'t set a content type header if it\'s not sending anything in the body', function(){
    var headers = getRequestHeaders(
      basicOperation,
      {}
    );

    expect(headers['Content-Type']).not.toBeDefined();
  });

  it('sets the content type to application/json if there is a body param present', function(){
    var headers = getRequestHeaders(
      complexOperation,
      { theBody: {} }
    );

    expect(headers['Content-Type']).toBe('application/json');
  });

  it('allows for the explicit specification of content type', function(){
    var headers = getRequestHeaders(
      complexOperation,
      { theBody: 'plain text' },
      { contentType: 'text/plain' }
    );

    expect(headers['Content-Type']).toBe('text/plain');
  });

  it('sets the content type to multipart/form-data if there is a file param present', function(){
    var headers = getRequestHeaders(
      complexOperation,
      {
        formParam: 'plain text',
        theFile: 'plain text'
      }
    );

    expect(headers['Content-Type']).toBe('multipart/form-data');
  });

  it('sets the content type to application/x-www-form-urlencoded if there is a form param present', function(){
    var headers = getRequestHeaders(
      complexOperation,
      { formParam: 'plain text' }
    );

    expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('raises an exception if an unsupported accept type is passed in', function(){
    expect(function(){
      getRequestHeaders(
        complexOperation,
        {},
        { accept: 'popcorn' }
      );
    }).toThrow();
  });

  it('raises an exception if an unsupported content type is used', function(){
    expect(function(){
      getRequestHeaders(
        complexOperation,
        {},
        { contentType: 'popcorn' }
      );
    }).toThrow();
  });
});
