/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';


define([
  'chai',
  'underscore',
  'jquery',
  'sinon',
  'lib/auth-errors',
  'lib/fxa-client',
  'lib/promise',
  'views/change_password',
  'models/reliers/relier',
  'models/auth_brokers/base',
  'models/user',
  '../../mocks/router',
  '../../lib/helpers'
],
function (chai, _, $, sinon, AuthErrors, FxaClient, p, View, Relier,
      Broker, User, RouterMock, TestHelpers) {
  var assert = chai.assert;
  var wrapAssertion = TestHelpers.wrapAssertion;

  describe('views/change_password', function () {
    var view;
    var routerMock;
    var fxaClient;
    var relier;
    var broker;
    var user;
    var account;

    beforeEach(function () {
      routerMock = new RouterMock();
      relier = new Relier();
      broker = new Broker({
        relier: relier
      });
      fxaClient = new FxaClient({
        broker: broker
      });
      user = new User();

      view = new View({
        router: routerMock,
        fxaClient: fxaClient,
        relier: relier,
        user: user,
        broker: broker
      });
    });

    afterEach(function () {
      $(view.el).remove();
      view.destroy();
      view = null;
      routerMock = null;
    });

    describe('with no session', function () {
      it('redirects to signin', function () {
        return view.render()
          .then(function () {
            assert.equal(routerMock.page, 'signin');
          });
      });
    });

    describe('with session', function () {
      beforeEach(function () {
        sinon.stub(view.fxaClient, 'isSignedIn', function () {
          return true;
        });
        account = user.createAccount({
          email: 'a@a.com',
          sessionToken: 'abc123',
          verified: true
        });

        sinon.stub(view, 'currentAccount', function () {
          return account;
        });

        return view.render()
          .then(function () {
            $('body').append(view.el);
          });
      });

      describe('isValid', function () {
        it('returns true if both old and new passwords are valid and different', function () {
          $('#old_password').val('password');
          $('#new_password').val('password2');

          assert.equal(view.isValid(), true);
        });

        it('returns true if both old and new passwords are valid and the same', function () {
          $('#old_password').val('password');
          $('#new_password').val('password');

          assert.equal(view.isValid(), true);
        });

        it('returns false if old password is too short', function () {
          $('#old_password').val('passwor');
          $('#new_password').val('password');

          assert.equal(view.isValid(), false);
        });

        it('returns false if new password is too short', function () {
          $('#old_password').val('password');
          $('#new_password').val('passwor');

          assert.equal(view.isValid(), false);
        });
      });

      describe('showValidationErrors', function () {
        it('shows an error if the password is invalid', function (done) {
          view.$('#old_password').val('passwor');
          view.$('#new_password').val('password');

          view.on('validation_error', function (which, msg) {
            wrapAssertion(function () {
              assert.ok(msg);
            }, done);
          });

          view.showValidationErrors();
        });

        it('shows an error if the new_password is invalid', function (done) {
          view.$('#old_password').val('password');
          view.$('#new_password').val('passwor');

          view.on('validation_error', function (which, msg) {
            wrapAssertion(function () {
              assert.ok(msg);
            }, done);
          });

          view.showValidationErrors();
        });
      });

      describe('submit', function () {
        it('prints incorrect password error message if old password is incorrect (event if passwords are the same)', function () {
          $('#old_password').val('bad_password');
          $('#new_password').val('bad_password');

          sinon.stub(view.fxaClient, 'checkPassword', function () {
            return p.reject(AuthErrors.toError('INCORRECT_PASSWORD'));
          });

          return view.submit()
            .then(assert.fail, function (err) {
              assert.isTrue(AuthErrors.is(err, 'INCORRECT_PASSWORD'));
            });
        });

        it('prints passwords must be different message if both passwords are the same and the first password is correct', function () {
          $('#old_password').val('password');
          $('#new_password').val('password');

          sinon.stub(view.fxaClient, 'checkPassword', function () {
            return p();
          });

          return view.submit()
            .then(assert.fail, function (err) {
              assert.ok(AuthErrors.is(err, 'PASSWORDS_MUST_BE_DIFFERENT'));
            });
        });

        it('changes from old to new password, redirects user to /settings', function () {
          $('#old_password').val('password');
          $('#new_password').val('new_password');

          var email = 'testuser@testuser.com';
          account.set('email', email);
          var oldPassword = 'password';
          var newPassword = 'new_password';

          sinon.stub(view.fxaClient, 'checkPassword', function () {
            return p();
          });

          sinon.stub(view.fxaClient, 'changePassword', function () {
            return p();
          });

          sinon.stub(view.fxaClient, 'signIn', function () {
            return p({});
          });

          return view.submit()
            .then(function () {
              assert.equal(routerMock.page, 'settings');
              assert.isTrue(view.fxaClient.checkPassword.calledWith(
                  email, oldPassword));
              assert.isTrue(view.fxaClient.changePassword.calledWith(
                  email, oldPassword, newPassword));
              assert.isTrue(view.fxaClient.signIn.calledWith(
                      email, newPassword, relier));
            });
        });

        it('changes from old to new password, keeps sessionTokenContext', function () {
          $('#old_password').val('password');
          $('#new_password').val('new_password');

          var email = 'testuser@testuser.com';
          account.set('email', email);
          account.set('sessionTokenContext', 'foo');

          sinon.stub(view.fxaClient, 'checkPassword', function () {
            return p();
          });

          sinon.stub(view.fxaClient, 'changePassword', function () {
            return p();
          });

          sinon.stub(view.fxaClient, 'signIn', function () {
            return p({});
          });

          return view.submit()
              .then(function () {
                assert.isTrue(view.fxaClient.signIn.calledWith(
                    email, 'new_password', relier, user,
                    { sessionTokenContext: 'foo' }));
              });
        });

        it('shows the unverified user message if the user is unverified', function () {
          sinon.stub(view.fxaClient, 'checkPassword', function () {
            return p();
          });

          sinon.stub(view.fxaClient, 'changePassword', function () {
            return p.reject(AuthErrors.toError('UNVERIFIED_ACCOUNT'));
          });

          $('#old_password').val('password');
          $('#new_password').val('new_password');

          return view.submit()
            .then(function () {
              assert.ok(view.$('#resend').length);
            });
        });
      });

      describe('resendVerificationEmail', function () {
        it('resends a verification email, and sends user to /confirm', function () {
          sinon.stub(view.fxaClient, 'signUpResend', function () {
            return p();
          });

          return view.resendVerificationEmail()
            .then(function () {
              assert.equal(routerMock.page, 'confirm');

              assert.isTrue(view.fxaClient.signUpResend.calledWith(relier));
            });
        });

        it('sends users to the signup page if their signUp token is invalid', function () {
          sinon.stub(view.fxaClient, 'signUpResend', function () {
            return p.reject(AuthErrors.toError('INVALID_TOKEN'));
          });

          return view.resendVerificationEmail()
            .then(function () {
              assert.equal(routerMock.page, 'signup');
            });
        });
      });
    });
  });
});


