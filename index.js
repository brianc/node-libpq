var PQ = module.exports = require('bindings')('addon.node').PQ;

var EventEmitter = require('events').EventEmitter;
var util = require('util')

PQ.prototype.connectSync = function(paramString) {
  if(!paramString) {
    paramString = '';
  }
  var connected = this.$connectSync(paramString);
  if(!connected) {
    this.finish();
    throw new Error(this.$getLastErrorMessage());
  }
};

PQ.prototype.finish = function() {
  this.$finish();
};

PQ.prototype.exec = function(commandText) {
  if(!commandText) {
    commandText = '';
  }
  this.$exec(commandText);
};

PQ.prototype.execParams = function(commandText, parameters) {
  if(!commandText) {
    commandText = '';
  }
  if(!parameters) {
    parameters = [];
  }
  this.$execParams(commandText, parameters);
};

PQ.prototype.prepare = function(statementName, commandText, nParams) {
  if(!commandText) {
    commandText = '';
  }
  nParams = Number(nParams) || 0;
  this.$prepare(statementName, commandText, nParams);
};

PQ.prototype.execPrepared = function(statementName, parameters) {
  if(!statementName) {
    statementName = '';
  }
  if(!parameters) {
    parameters = [];
  }
  this.$execPrepared(statementName, parameters);
}

PQ.prototype.resultStatus = function() {
  return this.$resultStatus();
};

PQ.prototype.resultErrorMessage = function() {
  return this.$resultErrorMessage();
};

PQ.prototype.clear = function() {
  this.$clear();
};

PQ.prototype.ntuples = function() {
  return this.$ntuples();
};

PQ.prototype.nfields = function() {
  return this.$nfields();
};

PQ.prototype.fname = function() {
  return this.$fname();
};

PQ.prototype.ftype = function() {
  return this.$ftype();
};

PQ.prototype.getvalue = function(row, col) {
  return this.$getvalue(row, col);
};

PQ.prototype.getisnull = function(row, col) {
  return this.$getisnull(row, col);
};
