/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';


define([
  'mocha',
  'chai',
  'views/sign_in'
],
function (mocha, chai, View) {
  var assert = chai.assert;

  describe('views/sign_in', function () {
    var view;

    beforeEach(function () {
      view = new View();
      view.render();
      $('#container').html(view.el);
    });

    afterEach(function () {
      view.remove();
      view.destroy();
    });

    describe('constructor creates it', function () {
      it('is drawn', function () {
        assert.ok($('#fxa-signin-header').length);
      });
    });

    describe('updatePasswordVisibility', function () {
      it('pw field set to text when clicked', function () {
        $('.show-password').click();
        assert.equal($('.password').attr('type'), 'text');
        assert.equal($('.show-password-label-text').text(), 'Hide');
      });

      it('pw field set to password when clicked again', function () {
        $('.show-password').click();
        $('.show-password').click();
        assert.equal($('.password').attr('type'), 'password');
        assert.equal($('.show-password-label-text').text(), 'Show');
      });
    });
  });

  describe('views/sign_in used for /force_auth', function () {
    var view;

    beforeEach(function () {
      view = new View({ forceAuth: true });
      view.render();
      $('#container').html(view.el);
    });

    afterEach(function () {
      view.remove();
      view.destroy();
    });

    it('does not allow the email to be edited', function () {
      assert.equal($('input[type=email]').length, 0);
    });

    it('user cannot create an account', function () {
      assert.equal($('a[href="/signup"]').length, 0);
    });

    it('isValid is successful when the password is filled out', function () {
      $('.password').val('password');
      assert.isTrue(view.isValid());
    });
  });

});


