var assert = require('assert');
var helper = require('./helper')

describe('sync query with parameters', function() {
  helper.setupIntegration();

  it('works with single parameter', function() {
    var queryText = 'SELECT $1::text as name'
    this.pq.execParams(queryText, ['Brian']);
    console.log(queryText)
    console.log(this.pq.resultErrorMessage());
    assert(this.pq.ntuples(), 1);
  })
})
