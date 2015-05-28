/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define([
  'intern',
  'intern!object',
  'intern/chai!assert',
  'require',
  'tests/lib/helpers',
  'tests/lib/basket',
  'tests/functional/lib/helpers',
  'tests/functional/lib/test'
], function (intern, registerSuite, assert, require, TestHelpers, waitForBasket, FunctionalHelpers, Test) {
  'use strict';

  var PAGE_URL = intern.config.fxaContentRoot + 'signup';
  var CUTOFF_YEAR = new Date().getFullYear() - 13;
  var OLD_ENOUGH_YEAR = CUTOFF_YEAR - 1;

  var email;
  var PASSWORD = '12345678';

  var fillOutSignUp = FunctionalHelpers.fillOutSignUp;

  function testOptedIn(context) {
    return function () {
      return context.get('remote')
        .findByCssSelector('#marketing-email-optin')
          .getVisibleText()
          .then(function (buttonText) {
            assert.equal(buttonText, 'Unsubscribe');
          })
        .end();
    };
  }

  function testNotOptedIn(context) {
    return function () {
      return context.get('remote')
        .findByCssSelector('#marketing-email-optin')
          .getVisibleText()
          .then(function (buttonText) {
            assert.equal(buttonText, 'Subscribe');
          })
        .end();
    };
  }

  registerSuite({
    name: 'communication preferences',

    beforeEach: function () {
      email = TestHelpers.createEmail();
      return FunctionalHelpers.clearBrowserState(this);
    },

    teardown: function () {
      return FunctionalHelpers.clearBrowserState(this);
    },

    'opt in to the marketing email': function () {
      var self = this;
      return FunctionalHelpers.openPage(this, PAGE_URL, '#fxa-signup-header')
        .then(function () {
          return fillOutSignUp(self, email, PASSWORD, OLD_ENOUGH_YEAR, false, true);
        })

        .findByCssSelector('#fxa-confirm-header')
        .end()

        .then(function () {
          return FunctionalHelpers.getVerificationLink(email, 0);
        })
        .then(function (verificationLink) {
          return self.get('remote').get(require.toUrl(verificationLink));
        })

        .findByCssSelector('#fxa-settings-header')
        .end()

        .then(function () {
          return waitForBasket(email);
        })

        .findByCssSelector('a[href="/settings/communication_preferences"]')
          .click()
        .end()

        .findByCssSelector('#fxa-communication-preferences-header')
        .end()

        .then(testOptedIn(self))

        // user signed up to basket, so has a preferences URL
        .findByCssSelector('#preferences-url')
        .end()

        // ensure the changes stick across refreshes
        .refresh()

        .findByCssSelector('#fxa-communication-preferences-header')
        .end()

        .then(testOptedIn(self))

        .findByCssSelector('#marketing-email-optin')
          .click()
        .end()

        .then(FunctionalHelpers.visibleByQSA('.success'))
        .end()

        // ensure the opt-out sticks across refreshes
        .refresh()

        .findByCssSelector('#fxa-communication-preferences-header')
        .end()

        .then(testNotOptedIn(self));
    },

    'do not opt in to the marketing email': function () {
      var self = this;
      return FunctionalHelpers.openPage(this, PAGE_URL, '#fxa-signup-header')
        .then(function () {
          return fillOutSignUp(self, email, PASSWORD, OLD_ENOUGH_YEAR, false, false);
        })

        .findByCssSelector('#fxa-confirm-header')
        .end()

        .then(function () {
          return FunctionalHelpers.getVerificationLink(email, 0);
        })
        .then(function (verificationLink) {
          return self.get('remote').get(require.toUrl(verificationLink));
        })

        .findByCssSelector('#fxa-settings-header')
        .end()

        .findByCssSelector('a[href="/settings/communication_preferences"]')
          .click()
        .end()

        .findByCssSelector('#fxa-communication-preferences-header')
        .end()

        .then(testNotOptedIn(self))

        // user does not have a basket account, so the
        // manage link does not exist.

        .then(Test.noElementByCssSelector(self, '#preferences-url'))

        .findByCssSelector('#marketing-email-optin')
          .click()
        .end()

        .then(FunctionalHelpers.visibleByQSA('.success'))
        .end()

        .then(function () {
          return waitForBasket(email);
        })

        // ensure the opt-in sticks across refreshes
        .refresh()

        .findByCssSelector('#fxa-communication-preferences-header')
        .end()

        .then(testOptedIn(self))

        // user should not have a preferences URL
        .findByCssSelector('#preferences-url')
        .end();
    }
  });

});
