/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const assert = require('insist');

const Server = require('./lib/server');

/*global describe,it*/

describe('server', function() {
  function checkVersionAndHeaders(path) {
    return function(done) {
      return Server.get('/').then(function(res) {
        assert.equal(res.statusCode, 200);
        assert.equal(res.result.version, require('../package.json').version);
        assert(res.result.commit);

        // and must return an STS header
        var stsHeader = res.headers['strict-transport-security'];
        assert.equal(stsHeader, 'max-age=15552000; includeSubDomains');

        // content type options header
        var contentTypeHeader = res.headers['x-content-type-options'];
        assert.equal(contentTypeHeader, 'nosniff');

        // xss protection header
        var xssHeader = res.headers['x-xss-protection'];
        assert.equal(xssHeader, '1; mode=block');

        // frame options header
        var frameHeader = res.headers['x-frame-options'];
        assert.equal(frameHeader, 'DENY');

        // but the other security builtin headers from hapi are not set
        var other = {
          'x-download-options': 1,
        };

        Object.keys(res.headers).forEach(function(header) {
          assert.ok(!other[header.toLowerCase()]);
        });
      }).done(done, done);
    };
  }

  describe('/', function() {
    it('should return the version', checkVersionAndHeaders('/'));
  });

  describe('/__version__', function() {
    it('should return the version', checkVersionAndHeaders('/__version__'));
  });

  describe('/__heartbeat__', function() {
    it('should succeed', function() {
      return Server.get('/__heartbeat__').then(function(res) {
        assert.equal(res.statusCode, 200);
      });
    });
  });

  describe('/__lbheartbeat__', function() {
    it('should succeed', function() {
      return Server.get('/__lbheartbeat__').then(function(res) {
        assert.equal(res.statusCode, 200);
      });
    });
  });
});
