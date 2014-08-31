var PQ = require('../')


describe('async connection', function() {
  it('works', function(done) {
    var pq = new PQ();
    pq.connect(done);
  });
});
