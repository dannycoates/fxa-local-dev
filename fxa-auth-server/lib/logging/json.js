/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const util = require('util');

const intel = require('intel');

const HOSTNAME = require('os').hostname();

function JsonFormatter(options) {
  intel.Formatter.call(this, options);
  this._format = '%O';
}
util.inherits(JsonFormatter, intel.Formatter);

JsonFormatter.prototype.format = function jsonFormat(record) {
  var rec = {
    level: record.level,
    levelname: record.levelname,
    hostname: HOSTNAME,
    name: record.name,
    pid: record.pid,
    time: record.timestamp,
    v: 1
  };

  if (typeof record.args[0] === 'string') {
    rec.msg = record.message;
  } else {
    for (var k in record.args[0]) {
      rec[k] = record.args[0][k];
    }
  }

  if (record.exception) {
    var err = record.exception;
    rec.err = {
      message: err.message,
      stack: record.stack,
      name: err.name,
      code: err.code,
      signal: err.signal
    };
    if (record.uncaughtException) {
      rec.err.uncaught = true;
    }
  }
  return intel.Formatter.prototype.format.call(this, rec);
};

module.exports = JsonFormatter;
