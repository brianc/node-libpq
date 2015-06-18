var PQ = require('../')
var assert = require('assert');

describe('server notices', function() {
  it('works', function(done) {
    var pq = new PQ();
    pq.connect(function(err) {
      assert.ifError(err);
      notices = []
      pq.on('notice', function(msg){notices.push(msg);});
      pq.exec("DO $$BEGIN RAISE NOTICE 'test1'; RAISE WARNING 'test2'; END;$$");
      assert.equal(notices.length, 2);
      assert.equal(notices[0], 'NOTICE:  test1\n');
      assert.equal(notices[1], 'WARNING:  test2\n');
      done();
    });
  });

});
