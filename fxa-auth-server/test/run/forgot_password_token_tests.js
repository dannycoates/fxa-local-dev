/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var test = require('tap').test
var log = { trace: function() {} }

var tokens = require('../../tokens')(log)
var ForgotPasswordToken = tokens.ForgotPasswordToken

var ACCOUNT = {
  uid: 'xxx',
  email: Buffer('test@example.com').toString('hex')
}


test(
  're-creation from tokendata works',
  function (t) {
    var token = null;
    ForgotPasswordToken.create(ACCOUNT)
      .then(
        function (x) {
          token = x
        }
      )
      .then(
        function () {
          return ForgotPasswordToken.fromHex(token.data, ACCOUNT)
        }
      )
      .then(
        function (token2) {
          t.equal(token.data, token2.data)
          t.equal(token.id, token2.id)
          t.equal(token.authKey, token2.authKey)
          t.equal(token.bundleKey, token2.bundleKey)
          t.equal(token.uid, token2.uid)
          t.equal(token.email, token2.email)
        }
      )
      .done(
        function () {
          t.end()
        },
        function (err) {
          t.fail(JSON.stringify(err))
          t.end()
        }
      )
  }
)


test(
  'ttl "works"',
  function (t) {
    ForgotPasswordToken.create(ACCOUNT)
      .then(
        function (token) {
          token.now = function() { return token.created }
          t.equal(token.ttl(), 900)
          token.now = function() { return token.created + 500 }
          t.equal(token.ttl(), 900)
          token.now = function() { return token.created + 1000 }
          t.equal(token.ttl(), 899)
          token.now = function() { return token.created + 1500 }
          t.equal(token.ttl(), 899)
        }
      )
      .done(
        function () {
          t.end()
        },
        function (err) {
          t.fail(JSON.stringify(err))
          t.end()
        }
      )
  }
)


test(
  'failAttempt decrements `tries`',
  function (t) {
    ForgotPasswordToken.create(ACCOUNT)
      .then(
        function (x) {
          t.equal(x.tries, 3)
          t.equal(x.failAttempt(), false)
          t.equal(x.tries, 2)
          t.equal(x.failAttempt(), false)
          t.equal(x.tries, 1)
          t.equal(x.failAttempt(), true)
        }
      )
      .done(
        function () {
          t.end()
        },
        function (err) {
          t.fail(JSON.stringify(err))
          t.end()
        }
      )
  }
)
