var assert = require('assert'),
    helper = require('./helper');

describe('prepare and execPrepared', function() {

  helper.setupIntegration();

  var statementName = 'get-name';

  describe('preparing a statement', function() {
    it('works properly', function() {
      this.pq.prepare(statementName, 'SELECT $1::text as name', 1);
      assert.ifError(this.pq.resultErrorMessage());
      assert.equal(this.pq.resultStatus(), 'PGRES_COMMAND_OK');
    });
  });

  describe('executing a prepared statement', function() {
    it('works properly', function() {
      this.pq.execPrepared(statementName, ['Brian']);
      assert.ifError(this.pq.resultErrorMessage());
      assert.strictEqual(this.pq.ntuples(), 1);
      assert.strictEqual(this.pq.nfields(), 1);
      assert.strictEqual(this.pq.getvalue(0, 0), 'Brian');
    });
  });
});
