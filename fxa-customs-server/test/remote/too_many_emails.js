/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

var test = require('tap').test
var restify = require('restify')
var TestServer = require('../test_server')
var mcHelper = require('../memcache-helper')

var TEST_EMAIL = 'test@example.com'
var TEST_IP = '192.0.2.1'

var config = {
  listen: {
    port: 7000
  },
  limits: {
    rateLimitIntervalSeconds: 1
  }
}

var testServer = new TestServer(config)

test(
  'startup',
  function (t) {
    testServer.start(function (err) {
      t.type(testServer.server, 'object', 'test server was started')
      t.notOk(err, 'no errors were returned')
      t.end()
    })
  }
)

test(
  'clear everything',
  function (t) {
    mcHelper.clearEverything(
      function (err) {
        t.notOk(err, 'no errors were returned')
        t.end()
      }
    )
  }
)

var client = restify.createJsonClient({
  url: 'http://127.0.0.1:' + config.listen.port
})

test(
  'too many sent emails',
  function (t) {
    client.post('/check', { email: TEST_EMAIL, ip: TEST_IP, action: 'recoveryEmailResendCode' },
      function (err, req, res, obj) {
        t.equal(res.statusCode, 200, 'first email attempt')
        t.equal(obj.block, false, 'resending the code')

        client.post('/check', { email: TEST_EMAIL, ip: TEST_IP, action: 'recoveryEmailResendCode' },
          function (err, req, res, obj) {
            t.equal(res.statusCode, 200, 'second email attempt')
            t.equal(obj.block, false, 'resending the code')

            client.post('/check', { email: TEST_EMAIL, ip: TEST_IP, action: 'recoveryEmailResendCode' },
              function (err, req, res, obj) {
                t.equal(res.statusCode, 200, 'third email attempt')
                t.equal(obj.block, false, 'resending the code')

                client.post('/check', { email: TEST_EMAIL, ip: TEST_IP, action: 'recoveryEmailResendCode' },
                  function (err, req, res, obj) {
                    t.equal(res.statusCode, 200, 'fourth email attempt')
                    t.equal(obj.block, true, 'operation blocked')

                    mcHelper.blockedEmailCheck(
                      function (isBlocked) {
                        t.equal(isBlocked, true, 'account is blocked')
                        t.end()
                      }
                    )
                  }
                )
              }
            )
          }
        )
      }
    )
  }
)

test(
  'failed logins expire',
  function (t) {
    setTimeout(
      function () {
        mcHelper.blockedEmailCheck(
          function (isBlocked) {
            t.equal(isBlocked, false, 'account no longer blocked')
            t.end()
          }
        )
      },
      config.limits.rateLimitIntervalSeconds * 1000
    )
  }
)

test(
  'teardown',
  function (t) {
    testServer.stop()
    t.equal(testServer.server.killed, true, 'test server has been killed')
    t.end()
  }
)
