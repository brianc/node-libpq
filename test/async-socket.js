var LibPQ = require('../')
var helper = require('./helper')
var assert = require('assert');

describe('async simple query', function() {
  helper.setupIntegration();

  it('dispatches simple query', function(done) {
    var success = this.pq.sendQuery('SELECT NOW()');
    assert(success, this.pq.errorMessage());
    var pq = this.pq;
    var consume = function(pq, cb) {
      if(!pq.isBusy()) return cb();
      pq.readable(function() {
        assert(pq.consumeInput(), pq.errorMessage());
        return consume(pq, cb);
      });
    }
    consume(pq, function() {
      assert.ifError(pq.errorMessage());
      assert(pq.getResult());
      assert.strictEqual(pq.getResult(), false);
      assert.strictEqual(pq.ntuples(), 1);
      done();
    });
  });
});
