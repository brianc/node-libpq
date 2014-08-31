var LibPQ = require('../')
var helper = require('./helper')
var assert = require('assert');

var consume = function(pq, cb) {
  if(!pq.isBusy()) return cb();
  pq.readable(function() {
    assert(pq.consumeInput(), pq.errorMessage());
    return consume(pq, cb);
  });
}

describe('async simple query', function() {
  helper.setupIntegration();

  it('dispatches simple query', function(done) {
    var pq = this.pq;
    assert(this.pq.setNonBlocking(true));
    this.pq.writable(function() {
      var success = pq.sendQuery('SELECT 1');
      assert.strictEqual(pq.flush(), 0, 'Should have flushed all data to socket');
      assert(success, pq.errorMessage());
      consume(pq, function() {
        assert.ifError(pq.errorMessage());
        assert(pq.getResult());
        assert.strictEqual(pq.getResult(), false);
        assert.strictEqual(pq.ntuples(), 1);
        assert.strictEqual(pq.getvalue(0, 0), '1');
        done();
      });
    });
  });

  it('dispatches parameterized query', function(done) {
    var pq = this.pq;
    var success = pq.sendQueryParams('SELECT $1::text as name', ['Brian']);
    assert(success, pq.errorMessage());
    assert.strictEqual(pq.flush(), 0, 'Should have flushed query text & parameters');
    consume(pq, function() {
      assert.ifError(pq.errorMessage());
      assert(pq.getResult());
      assert.strictEqual(pq.getResult(), false);
      assert.strictEqual(pq.ntuples(), 1);
      assert.equal(pq.getvalue(0, 0), 'Brian');
      done();
    })
  });

  it('dispatches named query', function(done) {
    var pq = this.pq;
    var statementName = 'async-get-name';
    var success = pq.sendPrepare(statementName, 'SELECT $1::text as name', 1);
    assert(success, pq.errorMessage());
    assert.strictEqual(pq.flush(), 0, 'Should have flushed query text');
    consume(pq, function() {
      assert.ifError(pq.errorMessage());
      assert(pq.getResult());
      assert.strictEqual(pq.getResult(), false);
      assert.equal(pq.ntuples(), 0);
      var success = pq.sendQueryPrepared(statementName, ['Brian']);
      assert(success, pq.errorMessage());
      assert.strictEqual(pq.flush(), 0, 'Should have flushed parameters');
      consume(pq, function() {
        assert.ifError(pq.errorMessage());
        assert(pq.getResult());
        assert.equal(pq.ntuples(), 1);
        assert.equal(pq.getvalue(0, 0), 'Brian');
        assert.strictEqual(pq.getResult(), false);
        done();
      });
    });
  });
});
