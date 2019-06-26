var Libpq = require('../');
var assert = require('assert');

describe('escapeLiteral', function() {
  it('fails to escape when the server is not connected', function() {
    var pq = new Libpq();
    var result = pq.escapeLiteral('test');
    assert.strictEqual(result, null);
    assert(pq.errorMessage());
  });

  it('escapes a simple string', function() {
    var pq = new Libpq();
    pq.connectSync();
    var result = pq.escapeLiteral('bang');
    assert.equal(result, "'bang'");
  });

  it('escapes a bad string', function() {
    var pq = new Libpq();
    pq.connectSync();
    var result = pq.escapeLiteral("'; TRUNCATE TABLE blah;");
    assert.equal(result, "'''; TRUNCATE TABLE blah;'");
  });

  it('escapes an empty string', function() {
	 var pq = new Libpq();
	 pq.connectSync();
	 var result = pq.escapeLiteral("");
	 assert.equal(result, "''");
  });

  it('escapes a null value', function() {
	 var pq = new Libpq();
	 pq.connectSync();
	 var result = pq.escapeLiteral(null);
	 assert.equal(result, "NULL");
  });

  it('fails to escape an undefined value', function() {
	 var pq = new Libpq();
	 pq.connectSync();
	 var result = pq.escapeLiteral();
	 assert.strictEqual(result, undefined);
  });
});

describe('escapeIdentifier', function() {
  it('fails when the server is not connected', function() {
    var pq = new Libpq();
    var result = pq.escapeIdentifier('test');
    assert.strictEqual(result, null);
    assert(pq.errorMessage());
  });

  it('escapes a simple string', function() {
    var pq = new Libpq();
    pq.connectSync();
    var result = pq.escapeIdentifier('bang');
    assert.equal(result, '"bang"');
  });
});
