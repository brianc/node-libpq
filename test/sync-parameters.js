var assert = require('assert');
var helper = require('./helper')

describe('sync query with parameters', function() {
  helper.setupIntegration();

  it('works with single string parameter', function() {
    var queryText = 'SELECT $1::text as name';
    this.pq.execParams(queryText, ['Brian']);
    assert.strictEqual(this.pq.ntuples(), 1);
    assert.strictEqual(this.pq.getvalue(0, 0), 'Brian');
  });

  it('works with a number parameter', function() {
    var queryText = 'SELECT $1::int as age';
    this.pq.execParams(queryText, [32]);
    assert.strictEqual(this.pq.ntuples(), 1);
    assert.strictEqual(this.pq.getvalue(0, 0), '32');
  });

  it('works with multiple parameters', function() {
    var queryText = 'INSERT INTO test_data(name, age) VALUES($1, $2)';
    this.pq.execParams(queryText, ['Barkley', 4]);
    assert.equal(this.pq.resultErrorMessage(), '');
  });

  it('works with buffer parameter', function() {
    var queryText = 'SELECT $1::bytea as bin';
    var octets = [0x00, 0x2a, 0x80, 0xff];
    var buffer = (Number(process.version.match(/^v(\d+)/)[1]) <= 4) ? new Buffer(octets) : Buffer.from(octets);
    this.pq.execParams(queryText, [buffer]);
    assert.strictEqual(this.pq.ntuples(), 1);
    assert.strictEqual(this.pq.getvalue(0, 0), '\\x002a80ff');
  });
});
