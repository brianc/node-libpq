var PQ = require('../');
var assert = require('assert');

describe('pipeline mode', function () {
  this.timeout(5000); // Increase timeout for async tests
  
  var pq;

  beforeEach(function () {
    pq = new PQ();
    pq.connectSync();
  });

  afterEach(function () {
    if (pq.connected) {
      pq.finish();
    }
  });

  describe('pipelineModeSupported', function () {
    it('returns a boolean', function () {
      var supported = pq.pipelineModeSupported();
      assert.strictEqual(typeof supported, 'boolean');
    });
  });

  // Skip pipeline tests if not supported (PostgreSQL < 14)
  describe('pipeline operations', function () {
    beforeEach(function () {
      if (!pq.pipelineModeSupported()) {
        this.skip();
      }
    });

    it('starts in non-pipeline mode', function () {
      assert.strictEqual(pq.pipelineStatus(), PQ.PIPELINE_OFF);
    });

    it('can enter pipeline mode', function () {
      var result = pq.enterPipelineMode();
      assert.strictEqual(result, true);
      assert.strictEqual(pq.pipelineStatus(), PQ.PIPELINE_ON);
    });

    it('can exit pipeline mode', function () {
      pq.enterPipelineMode();
      var result = pq.exitPipelineMode();
      assert.strictEqual(result, true);
      assert.strictEqual(pq.pipelineStatus(), PQ.PIPELINE_OFF);
    });

    it('can send multiple queries in pipeline mode', function (done) {
      pq.enterPipelineMode();
      pq.setNonBlocking(true);

      // Send multiple queries
      assert.strictEqual(pq.sendQueryParams('SELECT $1::int as num', ['1']), true);
      assert.strictEqual(pq.sendQueryParams('SELECT $1::int as num', ['2']), true);
      assert.strictEqual(pq.sendQueryParams('SELECT $1::int as num', ['3']), true);

      // Send sync to mark end of pipeline
      assert.strictEqual(pq.pipelineSync(), true);

      // Flush the queries
      pq.flush();

      // Read results
      var results = [];
      var finished = false;
      
      var processResults = function() {
        // Keep reading results while not busy
        while (!pq.isBusy()) {
          var hasResult = pq.getResult();
          if (!hasResult) {
            // No more results available right now
            break;
          }
          
          var status = pq.resultStatus();
          if (status === 'PGRES_TUPLES_OK') {
            results.push(parseInt(pq.getvalue(0, 0), 10));
          } else if (status === 'PGRES_PIPELINE_SYNC') {
            // Pipeline sync received, we're done
            finished = true;
            pq.stopReader();
            pq.removeAllListeners('readable');
            assert.deepStrictEqual(results, [1, 2, 3]);
            pq.exitPipelineMode();
            done();
            return;
          }
          // PGRES_COMMAND_OK and other statuses are ignored
        }
      };
      
      pq.on('readable', function () {
        if (finished) return;
        
        if (!pq.consumeInput()) {
          pq.stopReader();
          done(new Error('consumeInput failed: ' + pq.errorMessage()));
          return;
        }

        processResults();
      });

      pq.startReader();
    });

    it('handles errors in pipeline mode', function (done) {
      pq.enterPipelineMode();
      pq.setNonBlocking(true);

      // Send a valid query
      pq.sendQueryParams('SELECT $1::int as num', ['1']);
      // Send an invalid query (will cause error)
      pq.sendQuery('SELECT * FROM nonexistent_table_xyz_12345');
      // Send another valid query
      pq.sendQueryParams('SELECT $1::int as num', ['3']);
      // Send sync
      pq.pipelineSync();
      pq.flush();

      var gotError = false;
      var finished = false;

      var processResults = function() {
        while (!pq.isBusy()) {
          var hasResult = pq.getResult();
          if (!hasResult) {
            break;
          }

          var status = pq.resultStatus();
          if (status === 'PGRES_FATAL_ERROR') {
            gotError = true;
            // After error, pipeline should be aborted
            assert.strictEqual(pq.pipelineStatus(), PQ.PIPELINE_ABORTED);
          } else if (status === 'PGRES_PIPELINE_SYNC') {
            finished = true;
            pq.stopReader();
            pq.removeAllListeners('readable');
            assert.strictEqual(gotError, true, 'Should have received an error');
            pq.exitPipelineMode();
            done();
            return;
          }
        }
      };

      pq.on('readable', function () {
        if (finished) return;
        
        if (!pq.consumeInput()) {
          pq.stopReader();
          done(new Error('consumeInput failed: ' + pq.errorMessage()));
          return;
        }

        processResults();
      });

      pq.startReader();
    });

    it('sendFlushRequest works', function () {
      pq.enterPipelineMode();
      pq.setNonBlocking(true);
      pq.sendQueryParams('SELECT 1', []);
      var result = pq.sendFlushRequest();
      assert.strictEqual(result, true);
      pq.pipelineSync();
      // Need to consume results before exiting pipeline mode
      pq.flush();
      // Read and discard results synchronously
      while (pq.getResult()) {
        // consume all results
      }
      pq.exitPipelineMode();
    });
  });

  describe('pipeline constants', function () {
    it('exports pipeline status constants', function () {
      assert.strictEqual(PQ.PIPELINE_OFF, 0);
      assert.strictEqual(PQ.PIPELINE_ON, 1);
      assert.strictEqual(PQ.PIPELINE_ABORTED, 2);
    });
  });

  describe('error handling when not supported', function () {
    it('throws helpful error when pipeline mode not supported', function () {
      // Create a mock PQ without pipeline methods
      var mockPQ = {
        $enterPipelineMode: undefined
      };
      
      // Bind the prototype method to our mock
      var enterFn = PQ.prototype.enterPipelineMode.bind(mockPQ);
      
      assert.throws(function () {
        enterFn();
      }, /Pipeline mode is not supported/);
    });
  });
});
