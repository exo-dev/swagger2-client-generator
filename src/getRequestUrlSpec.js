'use strict';

var getRequestUrl = require('./getRequestUrl');
describe('get request url', function(){
  var basicOperation,
    complexOperation,
    arrayOperation;

  beforeEach(function(){
    basicOperation = {
      basePath: 'http://example.com/api',
      path: '/do/it',
      parameters: [
        {
          in: 'query',
          type: 'string',
          name: 'what'
        }
      ]
    };

    arrayOperation = {
      basePath: 'http://example.com/api',
      path: '/do/it',
      parameters: [
        {
          in: 'query',
          type: 'array',
          name: 'listOfStuff',
          items: {
            type: 'string'
          }
        }
      ]
    };

    complexOperation = {
      basePath: 'http://example.com/api',
      path: '/do/{what}.{format}',
      parameters: [
        {
          in: 'path',
          type: 'string',
          name: 'what'
        },
        {
          in: 'form',
          type: 'string',
          name: 'notRelevant'
        },
        {
          in: 'query',
          type: 'string',
          name: 'where'
        },
        {
          in: 'query',
          type: 'string',
          name: 'when'
        }
      ]
    };
  });

  it('provides the operation url when there is no data', function(){
    expect(getRequestUrl(basicOperation))
      .toBe('http://example.com/api/do/it');
  });

  it('fills out path params from given data', function(){
    expect(getRequestUrl(complexOperation, {what: 'that'}))
      .toBe('http://example.com/api/do/that.json');
  });

  it('fills out query params from given array data', function(){
    expect(getRequestUrl(arrayOperation, {listOfStuff: ['a', 'b', 'c']}))
      .toBe('http://example.com/api/do/it?listOfStuff=a&listOfStuff=b&listOfStuff=c');
  });

  it('throws an error if a required path param is missing', function(){
    expect(function(){
      getRequestUrl(complexOperation);
    }).toThrow();
  });

  it('adds present query params', function(){
    expect(getRequestUrl(complexOperation, {
      what: 'that', where: 'there', when: 'then'
    }))
      .toBe('http://example.com/api/do/that.json?where=there&when=then');
  });

  it('doesn\'t mind the presence of other params (such as form params)', function(){
    expect(getRequestUrl(complexOperation, {
      what: 'that', where: 'there', when: 'then', notRelevant: 'popcorn'
    }))
      .toBe('http://example.com/api/do/that.json?where=there&when=then');
  });
});
