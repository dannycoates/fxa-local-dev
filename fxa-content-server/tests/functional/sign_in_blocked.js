/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define([
  'intern',
  'intern!object',
  'tests/lib/helpers',
  'tests/functional/lib/helpers'
], function (intern, registerSuite, TestHelpers, FunctionalHelpers) {
  var config = intern.config;
  var PAGE_URL = config.fxaContentRoot + 'signin';
  var PASSWORD = 'password';
  var email;

  var thenify = FunctionalHelpers.thenify;

  var clearBrowserState = FunctionalHelpers.clearBrowserState;
  var click = FunctionalHelpers.click;
  var closeCurrentWindow = FunctionalHelpers.closeCurrentWindow;
  var createUser = FunctionalHelpers.createUser;
  var fillOutSignIn = thenify(FunctionalHelpers.fillOutSignIn);
  var fillOutSignInUnblock = FunctionalHelpers.fillOutSignInUnblock;
  var getUnblockInfo = FunctionalHelpers.getUnblockInfo;
  var openPage = thenify(FunctionalHelpers.openPage);
  var openTab = FunctionalHelpers.openTab;
  var openVerificationLinkInSameTab = FunctionalHelpers.openVerificationLinkInSameTab;
  var testErrorTextInclude = FunctionalHelpers.testErrorTextInclude;
  var testElementExists = FunctionalHelpers.testElementExists;
  var testElementTextInclude = FunctionalHelpers.testElementTextInclude;
  var type = FunctionalHelpers.type;
  var visibleByQSA = FunctionalHelpers.visibleByQSA;

  registerSuite({
    name: 'sign_in blocked',

    beforeEach: function () {
      email = TestHelpers.createEmail('blocked{id}');

      return this.remote
        .then(createUser(email, PASSWORD, { preVerified: true }))
        .then(clearBrowserState());
    },

    afterEach: function () {
      return this.remote
        .then(clearBrowserState());
    },

    'valid code entered': function () {
      return this.remote
        .then(openPage(this, PAGE_URL, '#fxa-signin-header'))
        .then(fillOutSignIn(this, email, PASSWORD))

        .then(testElementExists('#fxa-signin-unblock-header'))
        .then(testElementTextInclude('.verification-email-message', email))
        .then(fillOutSignInUnblock(email, 0))

        .then(testElementExists('#fxa-settings-header'));
    },

    'valid code with whitespace at the beginning entered': function () {
      return this.remote
        .then(openPage(this, PAGE_URL, '#fxa-signin-header'))
        .then(fillOutSignIn(this, email, PASSWORD))

        .then(testElementExists('#fxa-signin-unblock-header'))
        .then(testElementTextInclude('.verification-email-message', email))
        .then(getUnblockInfo(email, 0))
        .then(function (unblockInfo) {
          return this.parent
            .then(type('#unblock_code', '   ' + unblockInfo.unblockCode));
        })
        .then(click('button[type=submit]'))

        .then(testElementExists('#fxa-settings-header'));
    },

    'valid code with whitespace at the end entered': function () {
      return this.remote
        .then(openPage(this, PAGE_URL, '#fxa-signin-header'))
        .then(fillOutSignIn(this, email, PASSWORD))

        .then(testElementExists('#fxa-signin-unblock-header'))
        .then(testElementTextInclude('.verification-email-message', email))
        .then(getUnblockInfo(email, 0))
        .then(function (unblockInfo) {
          return this.parent
            .then(type('#unblock_code', unblockInfo.unblockCode + '   '));
        })
        .then(click('button[type=submit]'))

        .then(testElementExists('#fxa-settings-header'));
    },

    'invalid code entered': function () {
      return this.remote
        .then(openPage(this, PAGE_URL, '#fxa-signin-header'))
        .then(fillOutSignIn(this, email, PASSWORD))

        .then(testElementExists('#fxa-signin-unblock-header'))
        .then(testElementTextInclude('.verification-email-message', email))
        .then(type('#unblock_code', 'i'))
        .then(click('button[type=submit]'))

        .then(visibleByQSA('.tooltip'))
        .then(testElementTextInclude('.tooltip', 'invalid'));
    },

    'incorrect code entered': function () {
      return this.remote
        .then(openPage(this, PAGE_URL, '#fxa-signin-header'))
        .then(fillOutSignIn(this, email, PASSWORD))

        .then(testElementExists('#fxa-signin-unblock-header'))
        .then(testElementTextInclude('.verification-email-message', email))
        .then(type('#unblock_code', 'incorrec'))
        .then(click('button[type=submit]'))
        .then(visibleByQSA('.error'))
        .then(testErrorTextInclude('invalid'))
        .then(getUnblockInfo(email, 0))
        .then(function (unblockInfo) {
          return this.parent
            .then(type('#unblock_code', unblockInfo.unblockCode));
        })
        .then(click('button[type=submit]'))

        .then(testElementExists('#fxa-settings-header'));
    },

    'incorrect password entered': function () {
      return this.remote
        .then(openPage(this, PAGE_URL, '#fxa-signin-header'))
        .then(fillOutSignIn(this, email, 'incorrect'))

        .then(testElementExists('#fxa-signin-unblock-header'))
        .then(testElementTextInclude('.verification-email-message', email))
        .then(fillOutSignInUnblock(email, 0))

        .then(testElementExists('#fxa-signin-header'))
        .then(testErrorTextInclude('incorrect password'))
        .then(type('input[type=password]', PASSWORD))
        .then(click('button[type=submit]'))

        .then(testElementTextInclude('.verification-email-message', email))

        .then(fillOutSignInUnblock(email, 0))
        // the first code is no longer valid, must use the 2nd.
        .then(visibleByQSA('.error'))
        .then(testErrorTextInclude('invalid'))

        // get and consume the second code
        .then(fillOutSignInUnblock(email, 1))

        .then(testElementExists('#fxa-settings-header'));
    },

    'resend': function () {
      return this.remote
        .then(openPage(this, PAGE_URL, '#fxa-signin-header'))
        .then(fillOutSignIn(this, email, PASSWORD))

        .then(testElementExists('#fxa-signin-unblock-header'))
        .then(click('#resend'))
        .then(visibleByQSA('.success'))
        .then(testElementTextInclude('.success', 'resent'))
        // use the 2nd unblock code
        .then(fillOutSignInUnblock(email, 1))

        .then(testElementExists('#fxa-settings-header'));
    },

    'report signin success': function () {
      var unblockCode;
      return this.remote
        .then(openPage(this, PAGE_URL, '#fxa-signin-header'))
        .then(fillOutSignIn(this, email, PASSWORD))

        .then(testElementExists('#fxa-signin-unblock-header'))
        .then(getUnblockInfo(email, 0))
        .then(function (unblockInfo) {
          unblockCode = unblockInfo.unblockCode;
          return this.parent
            .then(openTab(unblockInfo.reportSignInLink));
        })
        .switchToWindow('newwindow')

        .then(testElementExists('#fxa-report-sign-in-header'))
        .then(click('button[type=submit]'))

        .then(testElementExists('#fxa-sign-in-reported-header'))

        .then(closeCurrentWindow())

        // try to use the code that was reported, it should error
        .then(function () {
          return this.parent
            .then(type('#unblock_code', unblockCode));
        })
        .then(click('button[type=submit]'))
        .then(visibleByQSA('.error'))
        .then(testErrorTextInclude('invalid'));
    },

    'report signin link unblockCode broken': function () {
      var unblockCode;
      return this.remote
        .then(openPage(this, PAGE_URL, '#fxa-signin-header'))
        .then(fillOutSignIn(this, email, PASSWORD))

        .then(testElementExists('#fxa-signin-unblock-header'))
        .then(getUnblockInfo(email, 0))
        .then(function (unblockInfo) {
          unblockCode = unblockInfo.unblockCode;
          var invalidLink = unblockInfo.reportSignInLink.replace(/unblockCode=[^&]+/, 'unblockCode=invalid_code');
          return this.parent
            .then(openTab(invalidLink));
        })
        .switchToWindow('newwindow')

        .then(testElementExists('#fxa-report-sign-in-link-damaged-header'))
        .then(closeCurrentWindow())

        // code can still be used
        .then(function () {
          return this.parent
            .then(type('#unblock_code', unblockCode));
        })
        .then(click('button[type=submit]'))

        .then(testElementExists('#fxa-settings-header'));
    },

    'report signin link uid broken': function () {
      var unblockCode;
      return this.remote
        .then(openPage(this, PAGE_URL, '#fxa-signin-header'))
        .then(fillOutSignIn(this, email, PASSWORD))

        .then(testElementExists('#fxa-signin-unblock-header'))
        .then(getUnblockInfo(email, 0))
        .then(function (unblockInfo) {
          unblockCode = unblockInfo.unblockCode;
          var invalidLink = unblockInfo.reportSignInLink.replace(/uid=[^&]+/, 'uid=invalid_uid');
          return this.parent
            .then(openTab(invalidLink));
        })
        .switchToWindow('newwindow')

        .then(testElementExists('#fxa-report-sign-in-link-damaged-header'))
        .then(closeCurrentWindow())

        // code can still be used
        .then(function () {
          return this.parent
            .then(type('#unblock_code', unblockCode));
        })
        .then(click('button[type=submit]'))

        .then(testElementExists('#fxa-settings-header'));
    },

    'report link opened after code used': function () {
      var reportSignInLink;
      return this.remote
        .then(openPage(this, PAGE_URL, '#fxa-signin-header'))
        .then(fillOutSignIn(this, email, PASSWORD))

        .then(testElementExists('#fxa-signin-unblock-header'))
        .then(getUnblockInfo(email, 0))
        .then(function (unblockInfo) {
          reportSignInLink = unblockInfo.reportSignInLink;
          return this.parent
            .then(type('#unblock_code', unblockInfo.unblockCode));
        })
        .then(click('button[type=submit]'))

        .then(testElementExists('#fxa-settings-header'))

        .then(function () {
          return this.parent
            .then(openPage(this, reportSignInLink, '#fxa-report-sign-in-header'));
        })
        // report link is expired and can no longer be used.
        .then(click('button[type=submit]'))
        .then(visibleByQSA('.error'))
        .then(testErrorTextInclude('invalid'));
    },

    'unverified user': function () {
      email = TestHelpers.createEmail('blocked{id}');

      return this.remote
        .then(createUser(email, PASSWORD, { preVerified: false }))
        .then(openPage(this, PAGE_URL, '#fxa-signin-header'))
        .then(fillOutSignIn(this, email, PASSWORD))

        .then(testElementExists('#fxa-signin-unblock-header'))
        // email 0 is the signup email, email 1 contains the code
        .then(fillOutSignInUnblock(email, 1))

        // It's substandard UX, but we decided to punt on making
        // users verified until v2. When submitting an unblock code
        // verifies unverified users, they will not need to open
        // the signup verification link, instead they'll go directly
        // to the settings page.
        .then(testElementExists('#fxa-confirm-header'))

        .then(openVerificationLinkInSameTab(email, 2))
        .then(testElementExists('#fxa-settings-header'));
    }
  });
});
