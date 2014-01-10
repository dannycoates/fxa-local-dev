/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var test = require('../ptaptest')
var uuid = require('uuid')
var log = { trace: console.log }

var config = require('../../config').root()
var Token = require('../../tokens')(log)
var DB = require('../../db')(
  config.db.backend,
  log,
  Token.error,
  Token.SessionToken,
  Token.KeyFetchToken,
  Token.AccountResetToken,
  Token.PasswordForgotToken,
  Token.PasswordChangeToken
)

var b16 = Buffer('00000000000000000000000000000000', 'hex')
var b32 = Buffer('0000000000000000000000000000000000000000000000000000000000000000', 'hex')

var ACCOUNT = {
  uid: uuid.v4('binary'),
  email: 'foo@bar.com',
  emailCode: b16,
  verified: false,
  verifyHash: b32,
  authSalt: b32,
  kA: b32,
  wrapWrapKb: b32
}


DB.connect(config[config.db.backend])
  .then(
    function (db) {

      test(
        'ping',
        function (t) {
          t.plan(1);
          return db.ping()
          .then(function(account) {
            t.pass('Got the ping ok')
          }, function(err) {
            t.fail('Should not have arrived here')
          })
        }
      )

      test(
        'account creation',
        function (t) {
          return db.createAccount(ACCOUNT)
          .then(function(account) {
            t.deepEqual(account.uid, ACCOUNT.uid, 'account.uid is the same as the input ACCOUNT.uid')
          })
          .then(function() {
            return db.accountExists(ACCOUNT.email)
          })
          .then(function(exists) {
            t.ok(exists, 'account exists for this email address')
          })
          .then(function() {
            return db.account(ACCOUNT.uid)
          })
          .then(function(account) {
            t.deepEqual(account.uid, ACCOUNT.uid)
            t.equal(account.email, ACCOUNT.email)
            t.deepEqual(account.emailCode, ACCOUNT.emailCode)
            t.equal(account.verified, ACCOUNT.verified)
            t.deepEqual(account.kA, ACCOUNT.kA)
            t.deepEqual(account.wrapWrapKb, ACCOUNT.wrapWrapKb)
            t.deepEqual(account.verifyHash, ACCOUNT.verifyHash)
            t.deepEqual(account.authSalt, ACCOUNT.authSalt)
          })
        }
      )

      test(
        'session token handling',
        function (t) {
          var tokenid;
          return db.emailRecord(ACCOUNT.email)
          .then(function(emailRecord) {
            return db.createSessionToken(emailRecord)
          })
          .then(function(sessionToken) {
            t.deepEqual(sessionToken.uid, ACCOUNT.uid)
            tokenid = sessionToken.tokenid
          })
          .then(function() {
            return db.sessionToken(tokenid)
          })
          .then(function(sessionToken) {
            t.deepEqual(sessionToken.tokenid, tokenid, 'token id matches')
            t.deepEqual(sessionToken.uid, ACCOUNT.uid)
            t.equal(sessionToken.email, ACCOUNT.email)
            t.deepEqual(sessionToken.emailCode, ACCOUNT.emailCode)
            t.equal(sessionToken.verified, ACCOUNT.verified)
            return sessionToken
          })
          .then(function(sessionToken) {
            return db.deleteSessionToken(sessionToken)
          })
        }
      )

      test(
        'keyfetch token handling',
        function (t) {
          var tokenid;
          return db.emailRecord(ACCOUNT.email)
          .then(function(emailRecord) {
            return db.createKeyFetchToken({uid: emailRecord.uid, kA: emailRecord.kA, wrapKb: ACCOUNT.wrapWrapKb})
          })
          .then(function(keyFetchToken) {
            t.deepEqual(keyFetchToken.uid, ACCOUNT.uid)
            tokenid = keyFetchToken.tokenid
          })
          .then(function() {
            return db.keyFetchToken(tokenid)
          })
          .then(function(keyFetchToken) {
            t.deepEqual(keyFetchToken.tokenid, tokenid, 'token id matches')
            t.deepEqual(keyFetchToken.uid, ACCOUNT.uid)
            t.equal(keyFetchToken.verified, ACCOUNT.verified)
            return keyFetchToken
          })
          .then(function(keyFetchToken) {
            return db.deleteKeyFetchToken(keyFetchToken)
          })
        }
      )

      test(
        'reset token handling',
        function (t) {
          var tokenid;
          return db.emailRecord(ACCOUNT.email)
          .then(function(emailRecord) {
            return db.createAccountResetToken(emailRecord)
          })
          .then(function(accountResetToken) {
            t.deepEqual(accountResetToken.uid, ACCOUNT.uid, 'account reset token uid should be the same as the account.uid')
            tokenid = accountResetToken.tokenid
          })
          .then(function() {
            return db.accountResetToken(tokenid)
          })
          .then(function(accountResetToken) {
            t.deepEqual(accountResetToken.tokenid, tokenid, 'token id matches')
            t.deepEqual(accountResetToken.uid, ACCOUNT.uid, 'account reset token uid should still be the same as the account.uid')
            return accountResetToken
          })
          .then(function(accountResetToken) {
            return db.deleteAccountResetToken(accountResetToken)
          })
        }
      )

      test(
        'forgotpwd token handling',
        function (t) {
          var token1;
          var token1tries = 0
          return db.emailRecord(ACCOUNT.email)
          .then(function(emailRecord) {
            return db.createPasswordForgotToken(emailRecord)
          })
          .then(function(passwordForgotToken) {
            t.deepEqual(passwordForgotToken.uid, ACCOUNT.uid, 'passwordForgotToken uid same as ACCOUNT.uid')
            token1 = passwordForgotToken
            token1tries = token1.tries
          })
          .then(function() {
            return db.passwordForgotToken(token1.tokenid)
          })
          .then(function(passwordForgotToken) {
            t.deepEqual(passwordForgotToken.tokenid, token1.tokenid, 'token id matches')
            t.deepEqual(passwordForgotToken.uid, token1.uid, 'tokens are identical')
            return passwordForgotToken
          })
          .then(function(passwordForgotToken) {
            passwordForgotToken.tries -= 1
            return db.updatePasswordForgotToken(passwordForgotToken)
          })
          .then(function() {
            return db.passwordForgotToken(token1.tokenid)
          })
          .then(function(passwordForgotToken) {
            t.deepEqual(passwordForgotToken.tokenid, token1.tokenid, 'token id matches again')
            t.equal(passwordForgotToken.tries, token1tries - 1, '')
            return passwordForgotToken
          })
          .then(function(passwordForgotToken) {
            return db.deletePasswordForgotToken(passwordForgotToken)
          })
        }
      )

      test(
        'email verification',
        function (t) {
          return db.emailRecord(ACCOUNT.email)
          .then(function(emailRecord) {
            return db.verifyEmail(emailRecord)
          })
          .then(function() {
            return db.account(ACCOUNT.uid)
          })
          .then(function(account) {
            t.ok(account.verified, 'account should now be verified')
          })
        }
      )

      test(
        'db.forgotPasswordVerified',
        function (t) {
          var token1;
          return db.emailRecord(ACCOUNT.email)
          .then(function(emailRecord) {
            return db.createPasswordForgotToken(emailRecord)
          })
          .then(function(passwordForgotToken) {
            return db.forgotPasswordVerified(passwordForgotToken)
          })
          .then(function(accountResetToken) {
            t.deepEqual(accountResetToken.uid, ACCOUNT.uid, 'uid is the same as ACCOUNT.uid')
            token1 = accountResetToken
          })
          .then(function() {
            return db.accountResetToken(token1.tokenid)
          })
          .then(function(accountResetToken) {
            t.deepEqual(accountResetToken.uid, ACCOUNT.uid)
            return db.deleteAccountResetToken(token1)
          })
        }
      )

      test(
        'db.accountDevices',
        function (t) {
          return db.emailRecord(ACCOUNT.email)
          .then(function(emailRecord) {
            return db.createSessionToken(emailRecord)
          })
          .then(function(sessionToken) {
            return db.createSessionToken(sessionToken)
          })
          .then(function(sessionToken) {
            return db.accountDevices(ACCOUNT.uid)
          })
          .then(function(devices) {
            t.equal(devices.length, 2, 'Account devices should be two')
            return devices[0]
          })
          .then(function(sessionToken) {
            return db.deleteSessionToken(sessionToken)
          })
          .then(function(sessionToken) {
            return db.accountDevices(ACCOUNT.uid)
          })
          .then(function(devices) {
            t.equal(devices.length, 1)
            return devices[0]
          })
          .then(function(sessionToken) {
            return db.deleteSessionToken(sessionToken)
          })
        }
      )

      test(
        'db.resetAccount',
        function (t) {
          return db.emailRecord(ACCOUNT.email)
          .then(function(emailRecord) {
            return db.createSessionToken(emailRecord)
          })
          .then(function(sessionToken) {
            return db.createAccountResetToken(sessionToken)
          })
          .then(function(accountResetToken) {
            return db.resetAccount(accountResetToken, ACCOUNT)
          })
          .then(function(sessionToken) {
            return db.accountDevices(ACCOUNT.uid)
          })
          .then(function(devices) {
            t.equal(devices.length, 0, 'The devices length should be zero')
          })
        }
      )

      test(
        'account deletion',
        function (t) {
          return db.emailRecord(ACCOUNT.email)
          .then(function(emailRecord) {
            t.deepEqual(emailRecord.uid, ACCOUNT.uid, 'retrieving uid should be the same')
            return db.deleteAccount(emailRecord)
          })
          .then(function() {
            return db.accountExists(ACCOUNT.email, 'account should exist for this email address')
          })
          .then(function(exists) {
            t.equal(exists, false, 'account should no longer exist')
          })
        }
      )

      test(
        'teardown',
        function (t) {
          return db.close()
        }
      )

    }
  )
