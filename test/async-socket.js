var LibPQ = require('../')
var helper = require('./helper')
var assert = require('assert');

describe('async read/write', function() {
  helper.setupIntegration();

  it('dispatches simple query', function(done) {
    this.pq.clear();
    var success = this.pq.sendQuery('SELECT NOW()');
    assert(success, this.pq.errorMessage());
    var pq = this.pq;
    var consume = function(pq, cb) {
      if(!pq.isBusy()) return cb();
      console.log('calling read');
      pq.read(function() {
        assert(pq.consumeInput(), pq.errorMessage());
        return consume(pq, cb);
      });
    }
    consume(this.pq, function() {
      done();
    });
  });
});
