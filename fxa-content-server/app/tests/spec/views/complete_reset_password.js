/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define([
  'chai',
  'sinon',
  'lib/promise',
  'lib/auth-errors',
  'lib/metrics',
  'lib/fxa-client',
  'lib/channels/inter-tab',
  'views/complete_reset_password',
  'models/reliers/relier',
  'models/auth_brokers/base',
  'models/user',
  '../../mocks/router',
  '../../mocks/window',
  '../../lib/helpers'
],
function (chai, sinon, p, AuthErrors, Metrics, FxaClient, InterTabChannel,
      View, Relier, Broker, User, RouterMock, WindowMock, TestHelpers) {
  'use strict';

  var assert = chai.assert;
  var wrapAssertion = TestHelpers.wrapAssertion;

  describe('views/complete_reset_password', function () {
    var view;
    var routerMock;
    var windowMock;
    var isPasswordResetComplete;
    var metrics;
    var fxaClient;
    var interTabChannel;
    var relier;
    var broker;
    var user;

    var EMAIL = 'testuser@testuser.com';
    var PASSWORD = 'password';
    var TOKEN = 'feed';
    var CODE = 'dea0fae1abc2fab3bed4dec5eec6ace7';
    var ACCOUNT_DATA = {
      sessionToken: 'abc123'
    };

    function testEventNotLogged(eventName) {
      assert.isFalse(TestHelpers.isEventLogged(metrics, eventName));
    }

    function testErrorLogged(error) {
      var normalizedError = view._normalizeError(error);
      assert.isTrue(TestHelpers.isErrorLogged(metrics, normalizedError));
    }

    function initView() {
      view = new View({
        broker: broker,
        fxaClient: fxaClient,
        interTabChannel: interTabChannel,
        metrics: metrics,
        relier: relier,
        router: routerMock,
        screenName: 'complete_reset_password',
        user: user,
        window: windowMock
      });
    }

    beforeEach(function () {
      routerMock = new RouterMock();
      metrics = new Metrics();
      relier = new Relier();
      broker = new Broker();
      fxaClient = new FxaClient();
      interTabChannel = new InterTabChannel();
      user = new User({
        fxaClient: fxaClient
      });

      windowMock = new WindowMock();
      windowMock.location.search = '?code=dea0fae1abc2fab3bed4dec5eec6ace7&email=testuser@testuser.com&token=feed';

      initView();

      // mock in isPasswordResetComplete
      isPasswordResetComplete = false;
      view.fxaClient.isPasswordResetComplete = function () {
        return p(isPasswordResetComplete);
      };

      return view.render();
    });

    afterEach(function () {
      metrics.destroy();

      view.remove();
      view.destroy();

      view = windowMock = metrics = null;
    });

    describe('render', function () {
      it('shows form if token, code and email are all present', function () {
        return view.render()
          .then(function () {
            testEventNotLogged('complete_reset_password.link_expired');
            assert.ok(view.$('#fxa-complete-reset-password-header').length);
          });
      });

      it('shows malformed screen if the token is missing', function () {
        windowMock.location.search = TestHelpers.toSearchString({
          code: 'faea',
          email: 'testuser@testuser.com'
        });

        initView();
        return view.render()
          .then(function () {
            testErrorLogged(AuthErrors.toError('DAMAGED_VERIFICATION_LINK'));
            assert.ok(view.$('#fxa-reset-link-damaged-header').length);
          });
      });

      it('shows malformed screen if the token is invalid', function () {
        windowMock.location.search = TestHelpers.toSearchString({
          // not a hex string
          code: 'dea0fae1abc2fab3bed4dec5eec6ace7',
          email: 'testuser@testuser.com',
          token: 'invalid_token'
        });

        initView();
        return view.render()
          .then(function () {
            testErrorLogged(AuthErrors.toError('DAMAGED_VERIFICATION_LINK'));
            assert.ok(view.$('#fxa-reset-link-damaged-header').length);
          });
      });

      it('shows malformed screen if the code is missing', function () {
        windowMock.location.search = TestHelpers.toSearchString({
          email: 'testuser@testuser.com',
          token: 'feed'
        });

        initView();
        return view.render()
          .then(function () {
            testErrorLogged(AuthErrors.toError('DAMAGED_VERIFICATION_LINK'));
            assert.ok(view.$('#fxa-reset-link-damaged-header').length);
          });
      });

      it('shows malformed screen if the code is invalid', function () {
        windowMock.location.search = TestHelpers.toSearchString({
          code: 'invalid_code',
          // not a hex string
          email: 'testuser@testuser.com',
          token: 'feed'
        });

        initView();
        return view.render()
          .then(function () {
            testErrorLogged(AuthErrors.toError('DAMAGED_VERIFICATION_LINK'));
            assert.ok(view.$('#fxa-reset-link-damaged-header').length);
          });
      });

      it('shows malformed screen if the email is missing', function () {
        windowMock.location.search = '?token=feed&code=dea0fae1abc2fab3bed4dec5eec6ace7';
        initView();
        return view.render()
          .then(function () {
            testErrorLogged(AuthErrors.toError('DAMAGED_VERIFICATION_LINK'));
            assert.ok(view.$('#fxa-reset-link-damaged-header').length);
          });
      });

      it('shows malformed screen if the email is invalid', function () {
        windowMock.location.search = TestHelpers.toSearchString({
          code: 'dea0fae1abc2fab3bed4dec5eec6ace7',
          email: 'does_not_validate',
          token: 'feed'
        });

        initView();
        return view.render()
          .then(function () {
            testErrorLogged(AuthErrors.toError('DAMAGED_VERIFICATION_LINK'));
            assert.ok(view.$('#fxa-reset-link-damaged-header').length);
          });
      });

      it('shows the expired screen if the token has already been used', function () {
        isPasswordResetComplete = true;
        return view.render()
          .then(function () {
            testErrorLogged(AuthErrors.toError('EXPIRED_VERIFICATION_LINK'));
            assert.ok(view.$('#fxa-reset-link-expired-header').length);
          });
      });
    });

    describe('isValid', function () {
      it('returns true if password & vpassword valid and the same', function () {
        view.$('#password').val(PASSWORD);
        view.$('#vpassword').val(PASSWORD);
        assert.isTrue(view.isValid());
      });

      it('returns false if password & vpassword are different', function () {
        view.$('#password').val('password');
        view.$('#vpassword').val('other_password');
        assert.isFalse(view.isValid());
      });

      it('returns false if password invalid', function () {
        view.$('#password').val('passwor');
        view.$('#vpassword').val('password');
        assert.isFalse(view.isValid());
      });

      it('returns false if vpassword invalid', function () {
        view.$('#password').val('password');
        view.$('#vpassword').val('passwor');
        assert.isFalse(view.isValid());
      });
    });

    describe('showValidationErrors', function () {
      it('shows an error if the password is invalid', function (done) {
        view.$('#password').val('passwor');
        view.$('#vpassword').val('password');

        view.on('validation_error', function (which, msg) {
          wrapAssertion(function () {
            assert.ok(msg);
          }, done);
        });

        view.showValidationErrors();
      });

      it('shows an error if the vpassword is invalid', function (done) {
        view.$('#password').val('password');
        view.$('#vpassword').val('passwor');

        view.on('validation_error', function (which, msg) {
          wrapAssertion(function () {
            assert.ok(msg);
          }, done);
        });

        view.showValidationErrors();
      });
    });

    describe('validateAndSubmit', function () {
      it('shows an error if passwords are different', function () {
        view.$('#password').val('password1');
        view.$('#vpassword').val('password2');

        return view.validateAndSubmit()
            .then(function () {
              assert(false, 'unexpected success');
            }, function () {
              assert.ok(view.$('.error').text().length);
            });
      });

      it('non-direct-access signs the user in and redirects to `/reset_password_complete` if broker does not say halt', function () {
        view.$('[type=password]').val(PASSWORD);

        sinon.stub(fxaClient, 'signIn', function () {
          return p(ACCOUNT_DATA);
        });
        sinon.stub(fxaClient, 'completePasswordReset', function () {
          return p(true);
        });
        sinon.stub(user, 'setSignedInAccount', function (newAccount) {
          return p(newAccount);
        });
        sinon.spy(broker, 'afterCompleteResetPassword');
        sinon.stub(relier, 'isDirectAccess', function () {
          return false;
        });

        // expect the intertab channel to be notified of login so the
        // starting window can complete the signin process.
        var loginSpy = sinon.spy();
        interTabChannel.on('login', loginSpy);

        return view.validateAndSubmit()
            .then(function () {
              assert.isTrue(fxaClient.completePasswordReset.calledWith(
                  EMAIL, PASSWORD, TOKEN, CODE));
              assert.isTrue(fxaClient.signIn.calledWith(
                  EMAIL,
                  PASSWORD,
                  relier,
                  { reason: view.fxaClient.SIGNIN_REASON.PASSWORD_RESET }
              ));
              assert.equal(routerMock.page, 'reset_password_complete');
              assert.isTrue(loginSpy.called);
              assert.isTrue(TestHelpers.isEventLogged(
                      metrics, 'complete_reset_password.verification.success'));
              return user.setSignedInAccount.returnValues[0].then(function (returnValue) {
                assert.isTrue(broker.afterCompleteResetPassword.calledWith(returnValue));
              });
            });
      });

      it('direct access signs the user in and redirects to `/settings` if broker does not say halt', function () {
        view.$('[type=password]').val(PASSWORD);

        sinon.stub(fxaClient, 'signIn', function () {
          return p(ACCOUNT_DATA);
        });
        sinon.stub(fxaClient, 'completePasswordReset', function () {
          return p(true);
        });
        sinon.stub(user, 'setSignedInAccount', function (newAccount) {
          return p(newAccount);
        });
        sinon.stub(relier, 'isDirectAccess', function () {
          return true;
        });

        return view.validateAndSubmit()
          .then(function () {
            assert.equal(routerMock.page, 'settings');
          });
      });

      it('halts if the broker says halt', function () {
        view.$('[type=password]').val(PASSWORD);

        sinon.stub(fxaClient, 'signIn', function () {
          return p(ACCOUNT_DATA);
        });
        sinon.stub(fxaClient, 'completePasswordReset', function () {
          return p(true);
        });
        sinon.stub(user, 'setSignedInAccount', function (newAccount) {
          return p(newAccount);
        });
        sinon.stub(broker, 'afterCompleteResetPassword', function () {
          return p({ halt: true });
        });

        return view.validateAndSubmit()
            .then(function () {
              assert.isTrue(fxaClient.completePasswordReset.calledWith(
                  EMAIL, PASSWORD, TOKEN, CODE));
              assert.isTrue(fxaClient.signIn.calledWith(
                  EMAIL,
                  PASSWORD,
                  relier,
                  { reason: view.fxaClient.SIGNIN_REASON.PASSWORD_RESET }
              ));
              assert.notEqual(routerMock.page, 'reset_password_complete');
              return user.setSignedInAccount.returnValues[0].then(function (returnValue) {
                assert.isTrue(broker.afterCompleteResetPassword.calledWith(returnValue));
              });
            });
      });

      it('reload view to allow user to resend an email on INVALID_TOKEN error', function () {
        view.$('[type=password]').val('password');

        sinon.stub(view.fxaClient, 'completePasswordReset', function () {
          return p.reject(AuthErrors.toError('INVALID_TOKEN'));
        });

        // isPasswordResetComplete needs to be overridden as well for when
        // render is re-loaded the token needs to be expired.
        sinon.stub(view.fxaClient, 'isPasswordResetComplete', function () {
          return p(true);
        });

        return view.validateAndSubmit()
            .then(function () {
              assert.ok(view.$('#fxa-reset-link-expired-header').length);
            });
      });

      it('shows error message if server returns an error', function () {
        view.$('[type=password]').val('password');

        sinon.stub(view.fxaClient, 'completePasswordReset', function () {
          return p.reject(new Error('uh oh'));
        });

        return view.validateAndSubmit()
            .then(assert.fail, function () {
              assert.ok(view.$('.error').text().length);
            });
      });
    });

    describe('resendResetEmail', function () {
      it('redirects to /confirm_reset_password if auth server is happy', function () {
        sinon.stub(view.fxaClient, 'passwordReset', function () {
          return p(true);
        });

        sinon.stub(view, 'getStringifiedResumeToken', function () {
          return 'resume token';
        });

        return view.resendResetEmail()
            .then(function () {
              assert.equal(routerMock.page, 'confirm_reset_password');
              assert.isTrue(view.fxaClient.passwordReset.calledWith(
                EMAIL,
                relier,
                {
                  resume: 'resume token'
                }
              ));
            });
      });

      it('shows server response as an error otherwise', function () {
        sinon.stub(view.fxaClient, 'passwordReset', function () {
          return p.reject(new Error('server error'));
        });

        return view.resendResetEmail()
            .then(function () {
              assert.equal(view.$('.error').text(), 'server error');
            });
      });
    });
  });
});
