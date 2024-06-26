var assert = require('assert');
var helper = require('./helper');

describe('prepare and execPrepared', function () {
  helper.setupIntegration();

  var statementName = 'get-name';

  describe('preparing a statement', function () {
    it('works properly', function () {
      this.pq.prepare(statementName, 'SELECT $1::text as name', 1);
      assert(!this.pq.resultErrorMessage());
      assert.equal(this.pq.resultStatus(), 'PGRES_COMMAND_OK');
    });
  });

  describe('executing a prepared statement', function () {
    it('works properly', function () {
      this.pq.execPrepared(statementName, ['Brian']);
      assert(!this.pq.resultErrorMessage());
      assert.strictEqual(this.pq.ntuples(), 1);
      assert.strictEqual(this.pq.nfields(), 1);
      assert.strictEqual(this.pq.getvalue(0, 0), 'Brian');
    });

    it('throws an error when second argument is not an array', function () {
      assert.throws(
        function () {
          this.pq.execPrepared(statementName, 'Brian');
        }.bind(this)
      );
    });
  });

  describe('describing a prepared statement', function() {
    it('works properly', function() {
      this.pq.describePrepared(statementName);
      assert.strictEqual(this.pq.nparams(), 1)
      assert.strictEqual(this.pq.paramtype(0), 25)
      assert.strictEqual(this.pq.nfields(), 1);
      assert.strictEqual(this.pq.fname(0), 'name');
      assert.strictEqual(this.pq.ftype(0), 25);
    });
  });
});
