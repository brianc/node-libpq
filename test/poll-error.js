var net = require('net');
var assert = require('assert');
var PQ = require('../');

// A reset peer reaches libuv as POLLERR, which it reports with status < 0 and revents == 0 after
// stopping the handle. Look only at revents and that wakeup is lost for good.
//
// The reset comes from a proxy, not from terminating the backend: a clean exit sends FIN, which is
// an ordinary readable event and misses this path. resetAndDestroy makes the RST deterministic.
describe('poll error', function () {
  var proxy;
  var proxyPort;
  var clientSockets;
  var sockets;

  beforeEach(function (done) {
    clientSockets = [];
    sockets = [];
    proxy = net.createServer(function (client) {
      var upstream = net.connect(
        Number(process.env.PGPORT || 5432),
        process.env.PGHOST || 'localhost'
      );
      clientSockets.push(client);
      sockets.push(client, upstream);
      client.pipe(upstream);
      upstream.pipe(client);
      client.on('error', function () {});
      upstream.on('error', function () {});
    });
    proxy.listen(0, '127.0.0.1', function () {
      proxyPort = proxy.address().port;
      done();
    });
  });

  afterEach(function (done) {
    // the reset does not reach the upstream socket through the pipe, so close every socket by
    // hand: one left open keeps the event loop alive and mocha never exits
    sockets.forEach(function (socket) {
      socket.destroy();
    });
    proxy.close(function () {
      done();
    });
  });

  it('wakes the reader when the peer resets the connection', function (done) {
    if (typeof net.Socket.prototype.resetAndDestroy !== 'function') {
      return this.skip();
    }

    var pq = new PQ();
    // connect asynchronously: the proxy runs in this process, so a blocking connect would never
    // let it accept
    pq.connect('host=127.0.0.1 port=' + proxyPort, function (err) {
      assert.ifError(err);
      assert(pq.setNonBlocking(true));

      // nothing comes back for a long while, so the reset is the only thing left for the socket
      // to report and the test cannot pass on a readable that carried real data
      assert(pq.sendQuery('SELECT pg_sleep(10)'), pq.errorMessage());
      assert.strictEqual(pq.flush(), 0, 'should have flushed the query to the socket');

      var finished = false;
      // under mocha's own timeout, so the failure names the actual problem
      var timer = setTimeout(function () {
        finish(new Error('no readable event arrived after the peer reset the connection'));
      }, 1500);

      var finish = function (err) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        pq.removeListener('readable', onReadable);
        pq.stopReader();
        pq.finish();
        done(err);
      };

      var onReadable = function () {
        assert.strictEqual(
          pq.consumeInput(),
          false,
          'consumeInput should report the reset connection'
        );
        assert(pq.errorMessage(), 'a reset connection should leave an error message');
        finish();
      };

      pq.on('readable', onReadable);
      pq.startReader();

      setTimeout(function () {
        clientSockets.forEach(function (socket) {
          socket.resetAndDestroy();
        });
      }, 100);
    });
  });
});
