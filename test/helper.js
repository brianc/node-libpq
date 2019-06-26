var PQ = require('../');

var createTable = function(pq) {
  pq.exec('CREATE TEMP TABLE test_data(name text, age int)')
  console.log(pq.resultErrorMessage());
  pq.exec("INSERT INTO test_data(name, age) VALUES ('brian', 32), ('aaron', 30), ('', null);")
};

module.exports = {
  setupIntegration: function() {
    before(function() {
      this.pq = new PQ();
      this.pq.connectSync();
      createTable(this.pq);
    });

    after(function() {
      this.pq.finish();
    });
  },
  parseHexOutput: function(hexx) {
    var hex = hexx.toString().substring(2); // remove leading \x
    var str = '';
    for (var i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  },
  createBuffer: function(string, encoding) {
    if (Number(process.version.match(/^v(\d+)/)[1]) <= 4) {
      return new Buffer(string, encoding);
    } else {
      return Buffer.from(string, encoding);
    }
  }
};
