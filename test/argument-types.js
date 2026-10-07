var PQ = require('../')
var assert = require('assert');

describe('argument type checking', function() {
  it('rejects a non-function connection callback', function() {
    var pq = new PQ();
    assert.throws(function() {
      pq.connect('host=/nonexistent connect_timeout=1', 42);
    }, /Must provide a connection callback/);
  });

  it('rejects non-array parameters', function() {
    var pq = new PQ();
    ['$execParams', '$execPrepared', '$sendQueryParams', '$sendQueryPrepared'].forEach(function(method) {
      assert.throws(function() {
        pq[method]('select $1', 42);
      }, /Parameters must be an array/);
    });
  });

  it('rejects a non-buffer in putCopyData', function() {
    var pq = new PQ();
    assert.throws(function() {
      pq.$putCopyData({});
    }, /Buffer expected/);
  });

  it('rejects a value that cannot be coerced to a string', function() {
    var pq = new PQ();
    assert.throws(function() {
      pq.escapeLiteral(Symbol('nope'));
    }, TypeError);
    assert.throws(function() {
      pq.escapeIdentifier(Symbol('nope'));
    }, TypeError);
  });

  it('propagates an error thrown while reading a parameter', function() {
    var pq = new PQ();
    var parameters = [];
    Object.defineProperty(parameters, 0, { enumerable: true, get: function() {
      throw new Error('boom');
    }});
    parameters.length = 1;
    assert.throws(function() {
      pq.execParams('select $1', parameters);
    }, /boom/);
  });
});
