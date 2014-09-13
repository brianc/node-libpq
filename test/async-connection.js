var PQ = require('../'),
    assert = require('assert');


describe('async connection', function () {
  it('works', function (done) {
    var pq = new PQ();
    pq.connect(function (err) {
      assert.ifError(err);
      pq.exec('SELECT NOW()');
      assert.equal(pq.ntuples(), 1);
      done();
    });
  });

  it('works with hard-coded connection parameters', function (done) {
    var pq = new PQ();
    pq.connect('host=localhost', done);
  });

  it('returns an error to the callback if connection fails', function (done) {
    new PQ().connect('host=asldkfjasldkfjalskdfjasdf', function (err) {
      assert(err, 'should have passed an error');
      done();
    });
  });
});
