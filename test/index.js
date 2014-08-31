var Client = require('../')

describe('connecting', function() {
  it('works', function() {
    var client = new Client();
    client.connectSync();
  });
});

describe('callbacks', function() {
  it('works', function() {
    var client = new Client();
    client.test();
  })
});
