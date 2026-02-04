var PQ = require('../');
var assert = require('assert');

describe('pipeline mode', function () {
  this.timeout(10000);
  
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

  // Skip pipeline tests if not supported
  // Pipeline mode requires BOTH:
  // 1. Client library compiled with PostgreSQL 14+ (pipelineModeSupported)
  // 2. Server version 14+ (serverVersion >= 140000)
  describe('pipeline operations', function () {
    before(function () {
      // Check if pipeline mode is supported using a temporary connection
      var testPq = new PQ();
      testPq.connectSync();
      var clientSupported = testPq.pipelineModeSupported();
      var serverVersion = testPq.serverVersion();
      testPq.finish();
      
      // Pipeline mode requires PostgreSQL 14+ on both client and server
      var serverSupported = serverVersion >= 140000;
      
      if (!clientSupported) {
        console.log('Pipeline mode not supported by client library. Skipping pipeline tests.');
        this.skip();
      }
      
      if (!serverSupported) {
        console.log('Pipeline mode not supported by server (version: ' + serverVersion + ', requires 140000+). Skipping pipeline tests.');
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
      
      // Read results using polling approach
      var results = [];
      
      var readResults = function() {
        // Consume any available input
        pq.consumeInput();
        
        // Process all available results
        while (!pq.isBusy()) {
          var hasResult = pq.getResult();
          if (!hasResult) {
            break;
          }
          
          var status = pq.resultStatus();
          
          if (status === 'PGRES_TUPLES_OK') {
            results.push(parseInt(pq.getvalue(0, 0), 10));
          } else if (status === 'PGRES_PIPELINE_SYNC') {
            return true;
          }
        }
        return false;
      };
      
      // Poll for results
      var attempts = 0;
      var maxAttempts = 100;
      
      var poll = function() {
        attempts++;
        if (readResults()) {
          assert.deepStrictEqual(results, [1, 2, 3]);
          pq.exitPipelineMode();
          done();
          return;
        }
        
        if (attempts >= maxAttempts) {
          done(new Error('Timeout waiting for pipeline results. Got: ' + JSON.stringify(results)));
          return;
        }
        
        setTimeout(poll, 50);
      };
      
      poll();
    });

    it('handles errors in pipeline mode', function (done) {
      pq.enterPipelineMode();
      pq.setNonBlocking(true);

      // Send a valid query
      pq.sendQueryParams('SELECT $1::int as num', ['1']);
      // Send an invalid query (will cause error)
      pq.sendQuery('SELECT * FROM nonexistent_table_xyz_12345');
      // Send another valid query (will be skipped due to error)
      pq.sendQueryParams('SELECT $1::int as num', ['3']);
      // Send sync
      pq.pipelineSync();
      pq.flush();

      var gotError = false;

      var readResults = function() {
        pq.consumeInput();
        
        while (!pq.isBusy()) {
          var hasResult = pq.getResult();
          if (!hasResult) {
            break;
          }

          var status = pq.resultStatus();
          
          if (status === 'PGRES_FATAL_ERROR') {
            gotError = true;
            assert.strictEqual(pq.pipelineStatus(), PQ.PIPELINE_ABORTED);
          } else if (status === 'PGRES_PIPELINE_SYNC') {
            return true;
          }
        }
        return false;
      };

      var attempts = 0;
      var maxAttempts = 100;
      
      var poll = function() {
        attempts++;
        if (readResults()) {
          assert.strictEqual(gotError, true, 'Should have received an error');
          pq.exitPipelineMode();
          done();
          return;
        }
        
        if (attempts >= maxAttempts) {
          done(new Error('Timeout waiting for pipeline error results'));
          return;
        }
        
        setTimeout(poll, 50);
      };
      
      poll();
    });

    it('sendFlushRequest works', function () {
      pq.enterPipelineMode();
      pq.setNonBlocking(true);
      pq.sendQueryParams('SELECT 1 as num', []);
      var result = pq.sendFlushRequest();
      assert.strictEqual(result, true);
      // Just verify the function works, don't need to read results
      pq.pipelineSync();
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
