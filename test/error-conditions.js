var PQ = require('../'),
    assert = require('assert');

describe('without being connected', function () {
  it('exec fails', function () {
    var pq = new PQ();

    pq.exec();
    assert.equal(pq.resultStatus(), 'PGRES_FATAL_ERROR');
    assert(pq.errorMessage());
  });

  it('fails on async query', function () {
    var pq = new PQ();
    var success = pq.sendQuery('blah');

    assert.strictEqual(success, false);
    assert.equal(pq.resultStatus(), 'PGRES_FATAL_ERROR');
    assert(pq.errorMessage());
  });
});
