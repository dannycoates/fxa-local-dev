/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'


const assert = require('insist')
var TestServer = require('../test_server')
const Client = require('../client')()
var P = require('../../lib/promise')
var request = P.promisify(require('request'))


describe('remote base path', function() {
  this.timeout(15000)
  let server, config
  before(() => {
    process.env.PUBLIC_URL = 'http://127.0.0.1:9000/auth'
    config = require('../../config').getProperties()
    config.publicUrl = process.env.PUBLIC_URL
    return TestServer.start(config)
      .then(s => {
        server = s
      })
  })

  function testVersionRoute(path) {
    return () => {
      return request(config.publicUrl + path)
        .spread((res, body) => {
          assert.equal(res.statusCode, 200)
          var json = JSON.parse(body)
          assert.deepEqual(Object.keys(json), ['version', 'commit', 'source'])
          assert.equal(json.version, require('../../package.json').version, 'package version')
          assert.ok(json.source && json.source !== 'unknown', 'source repository')

          // check that the git hash just looks like a hash
          assert.ok(json.commit.match(/^[0-9a-f]{40}$/), 'The git hash actually looks like one')
        })
    }
  }

  it(
    'alternate base path',
    () => {
      var email = Math.random() + '@example.com'
      var password = 'ok'
      // if this doesn't crash, we're all good
      return Client.create(config.publicUrl, email, password, server.mailbox)
    }
  )

  it(
    '.well-known did not move',
    () => {
      return request('http://127.0.0.1:9000/.well-known/browserid')
        .spread((res, body) => {
          assert.equal(res.statusCode, 200)
          var json = JSON.parse(body)
          assert.equal(json.authentication, '/.well-known/browserid/sign_in.html')
        })
    }
  )

  it(
    '"/" returns valid version information',
    testVersionRoute('/')
  )

  it(
    '"/__version__" returns valid version information',
    testVersionRoute('/__version__')
  )

  after(() => {
    delete process.env.PUBLIC_URL
    return TestServer.stop(server)
  })
})
