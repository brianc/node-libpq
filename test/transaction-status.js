var Libpq = require('../');
var assert = require('assert');

describe('transactionStatus', function() {

  it('returns PQTRANS_UNKNOWN when not connected', function() {
    var pq = new Libpq();
    assert.strictEqual(pq.transactionStatus(), 4);
  });

  it('returns PQTRANS_IDLE after connecting', function() {
    var pq = new Libpq();
    pq.connectSync();
    assert.strictEqual(pq.transactionStatus(), 0);
    pq.finish();
  });

  it('returns PQTRANS_IDLE after a simple query', function() {
    var pq = new Libpq();
    pq.connectSync();
    pq.exec('SELECT 1');
    assert.strictEqual(pq.transactionStatus(), 0);
    pq.finish();
  });

  it('returns PQTRANS_INTRANS inside a transaction', function() {
    var pq = new Libpq();
    pq.connectSync();
    pq.exec('BEGIN');
    assert.strictEqual(pq.transactionStatus(), 2);
    pq.exec('ROLLBACK');
    pq.finish();
  });

  it('returns PQTRANS_IDLE after COMMIT', function() {
    var pq = new Libpq();
    pq.connectSync();
    pq.exec('BEGIN');
    assert.strictEqual(pq.transactionStatus(), 2);
    pq.exec('COMMIT');
    assert.strictEqual(pq.transactionStatus(), 0);
    pq.finish();
  });

  it('returns PQTRANS_INERROR after a failed query in a transaction', function() {
    var pq = new Libpq();
    pq.connectSync();
    pq.exec('BEGIN');
    pq.exec('SELECT FROM nonexistent_table_xyz');
    assert.strictEqual(pq.transactionStatus(), 3);
    pq.exec('ROLLBACK');
    pq.finish();
  });

  it('returns PQTRANS_IDLE after ROLLBACK from error state', function() {
    var pq = new Libpq();
    pq.connectSync();
    pq.exec('BEGIN');
    pq.exec('SELECT FROM nonexistent_table_xyz');
    assert.strictEqual(pq.transactionStatus(), 3);
    pq.exec('ROLLBACK');
    assert.strictEqual(pq.transactionStatus(), 0);
    pq.finish();
  });

});
