var PQ = require('../');
var assert = require('assert');

describe('Receive notices', function() {
  var notice = null;

  before(function() {
    this.pq = new PQ();
    this.pq.connectSync();
    this.pq.exec('SET client_min_messages TO DEBUG');

    this.pq.on('notice', function (arg) {
      notice = arg;
    })
  });

  this.afterEach(function () {
    notice = null;
  })

  it('works with "debug" messages', function() {
    this.pq.exec('DO $$BEGIN RAISE DEBUG \'this is a debug message\'; END$$');

    assert.notEqual(notice, null);
    assert.equal(notice.severity, 'DEBUG');
    assert.equal(notice.messagePrimary, 'this is a debug message');
  });

  it('works with "log" messages', function() {
    this.pq.exec('DO $$BEGIN RAISE LOG \'this is a log message\'; END$$');

    assert.notEqual(notice, null);
    assert.equal(notice.severity, 'LOG');
    assert.equal(notice.messagePrimary, 'this is a log message');
  });

  it('works with "info" messages', function() {
    this.pq.exec('DO $$BEGIN RAISE INFO \'this is an info message\'; END$$');

    assert.notEqual(notice, null);
    assert.equal(notice.severity, 'INFO');
    assert.equal(notice.messagePrimary, 'this is an info message');
  });

  it('works with "notice" messages', function() {
    this.pq.exec('DO $$BEGIN RAISE NOTICE \'this is a notice message\'; END$$');

    assert.notEqual(notice, null);
    assert.equal(notice.severity, 'NOTICE');
    assert.equal(notice.messagePrimary, 'this is a notice message');
  });

  it('works with "warning" messages', function() {
    this.pq.exec('DO $$BEGIN RAISE WARNING \'this is a warning message\'; END$$');

    assert.notEqual(notice, null);
    assert.equal(notice.severity, 'WARNING');
    assert.equal(notice.messagePrimary, 'this is a warning message');
  });

  it('ignores "exception" messages', function() {
    this.pq.exec('DO $$BEGIN RAISE EXCEPTION \'this is an exception message\'; END$$');

    assert.equal(notice, null);
  });

  it('works with internally-generated messages', function() {
    this.pq.exec('ROLLBACK');

    assert.notEqual(notice, null);
    assert.equal(notice.severity, 'WARNING');
    assert.equal(typeof notice.messagePrimary, 'string'); // might be localized
  });

  after(function() {
    this.pq.finish();
  });
});
