var assert = require('assert');
var helper = require('./helper')

describe('prepare and execPrepared', function() {

  helper.setupIntegration();

  var statementName = 'get-name';

  describe('preparing a statement', function() {
    it('works properly', function() {
      this.pq.prepare(statementName, 'SELECT $1::text as name', 1);
      assert(!this.pq.resultErrorMessage());
      assert.equal(this.pq.resultStatus(), 'PGRES_COMMAND_OK');
    });
  });

  describe('executing a prepared statement', function() {
    it('works properly', function() {
      this.pq.execPrepared(statementName, ['Brian']);
      assert(!this.pq.resultErrorMessage());
      assert.strictEqual(this.pq.ntuples(), 1)
      assert.strictEqual(this.pq.nfields(), 1);
      assert.strictEqual(this.pq.getvalue(0, 0), 'Brian');
    });
  });
});

describe('prepare and execPrepared with binary parameter', function() {

  helper.setupIntegration();

  var statementName = 'get-binary-param';

  it('works properly', function() {
    this.pq.prepare(statementName, 'SELECT $1::bytea as value', 1);
    assert.ifError(this.pq.resultErrorMessage());
    assert.equal(this.pq.resultStatus(), 'PGRES_COMMAND_OK');

    var string = 'fo\\o';
    var buffer = helper.createBuffer(string, 'utf8');
    this.pq.execPrepared(statementName, [buffer]);
    assert.ifError(this.pq.resultErrorMessage());
    assert.strictEqual(this.pq.ntuples(), 1)
    assert.strictEqual(this.pq.nfields(), 1);
    var value = helper.parseHexOutput(this.pq.getvalue(0, 0));
    assert.strictEqual(value, string);
  });
});
