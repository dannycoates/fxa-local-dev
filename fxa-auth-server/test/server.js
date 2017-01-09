/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const assert = require('insist');
const util = require('util');

const Server = require('./lib/server');

/*global describe,it*/

function checkVersionAndHeaders(path) {
  return function(done) {
    Server.get(path).then(function(res) {
      assert.equal(res.statusCode, 200);
      assert.equal(res.result.version, require('../package.json').version);
      assert.deepEqual(Object.keys(res.result), ['version', 'commit', 'source' ]);
      assert(res.result.source);
      assert(res.result.commit);
      assert.ok(res.result.commit.match(/^[0-9a-f]{40}$/));

      // and must return an STS header
      var stsHeader = res.headers['strict-transport-security'];
      assert.equal(stsHeader, 'max-age=15552000; includeSubDomains');

      // content type options header
      var contentTypeHeader = res.headers['x-content-type-options'];
      assert.equal(contentTypeHeader, 'nosniff');

      // but the other security builtin headers from hapi are not set
      var other = {
        'x-download-options': 1,
        'x-frame-options': 1,
        'x-xss-protection': 1
      };

      Object.keys(res.headers).forEach(function(header) {
        assert.ok(!other[header.toLowerCase()]);
      });
    }).done(done, done);
  };
}

describe('server', function() {
  describe('/', function() {
    it('should return the version', checkVersionAndHeaders('/'));
  });

  describe('/__version__', function() {
    it('should return the version', checkVersionAndHeaders('/__version__'));
  });

  describe('/__heartbeat__', function() {
    it('should succeed', function(done) {
      Server.get('/__heartbeat__').then(function(res) {
        assert.equal(res.statusCode, 200);
      }).done(done, done);
    });
  });

  describe('/config', function() {
    it('should succeed', function(done) {
      Server.get('/config').then(function(res) {
        assert.equal(res.statusCode, 200);
        assert(res.result.browserid.issuer);
        assert(res.result.browserid.verificationUrl);
        assert(res.result.contentUrl);
      }).done(done, done);
    });
  });

  describe('a large request body', function() {
    var args = { token: '' };
    var argslen = JSON.stringify(args).length;
    const HAPI_PAYLOAD_MAXBYTES = 16384; // see '../lib/server.js'
    var blob = new Array(HAPI_PAYLOAD_MAXBYTES - argslen + 1).join('a');

    it('below the limit, returns 40? with ???', function(done) {
      var content = util._extend(args);
      content.token = blob;
      content = JSON.stringify(content);

      Server.api.post({
        url: '/token',
        payload: content,
        headers: {
          'content-length': content.length
        }
      }).then(function(res) {
        assert.equal(res.statusCode, 400);
        assert.equal(res.result.errno, 109);
        assert.equal(res.result.error, 'Bad Request');
        assert.equal(res.result.message, 'Invalid request parameter');
      }).done(done, done);
    });

    it('above the limit, returns 400 with Payload too large', function(done) {
      var content = util._extend(args);
      content.token = blob + 'a'; // one byte over the limit
      content = JSON.stringify(content);

      Server.api.post({
        url: '/token',
        payload: content,
        headers: {
          'content-length': content.length
        }
      }).then(function(res) {
        var result = res.result;
        assert.equal(res.statusCode, 400);
        assert.equal(result.errno, 999);
        assert.equal(result.error, 'Bad Request');
        var message = result.message;
        assert.equal(message.indexOf('Payload content length greater'), 0);
      }).done(done, done);
    });
  });
});
