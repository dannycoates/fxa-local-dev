/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const exec = require('child_process').exec;
const path = require('path');
const util = require('util');

const version = require('../../package.json').version;
var commitHash, source;

// See if config/version.json exists (part of rpm builds)
(function() {
  try {
    var info = require('../../config/version.json');
    commitHash = info.version.hash;
    source = info.version.source;
  } catch(e) { /* ignore */ }
})();

module.exports = {
  handler: function index(req, reply) {
    function sendReply() {
      reply({
        version: version,
        commit: commitHash,
        source: source
      }).spaces(2);
    }

    if (commitHash) {
      return sendReply();
    }

    // figure it out from .git
    var gitDir = path.resolve(__dirname, '..', '..', '.git');
    var cmd = util.format('git --git-dir=%s rev-parse HEAD', gitDir);
    exec(cmd, function(err, stdout) {
      commitHash = stdout.replace(/\s+/, '');
      exec('git config --get remote.origin.url', function(err, stdout) {
        source = stdout.replace(/\s+/, '');
        return sendReply();
      });
    });
  }
};
