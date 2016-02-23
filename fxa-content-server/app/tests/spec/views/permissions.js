/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function (require, exports, module) {
  'use strict';

  var $ = require('jquery');
  var Backbone = require('backbone');
  var Broker = require('models/auth_brokers/base');
  var chai = require('chai');
  var Metrics = require('lib/metrics');
  var OAuthErrors = require('lib/oauth-errors');
  var p = require('lib/promise');
  var Relier = require('models/reliers/relier');
  var Notifier = require('lib/channels/notifier');
  var sinon = require('sinon');
  var TestHelpers = require('../../lib/helpers');
  var User = require('models/user');
  var View = require('views/permissions');
  var WindowMock = require('../../mocks/window');

  var assert = chai.assert;

  describe('views/permissions', function () {
    var account;
    var broker;
    var email;
    var metrics;
    var model;
    var notifier;
    var onSubmitComplete;
    var relier;
    var user;
    var view;
    var windowMock;

    var CLIENT_ID = 'relier';
    var PERMISSIONS = ['profile:email', 'profile:uid'];
    var SERVICE_NAME = 'Relier';
    var SERVICE_URI = 'relier.com';

    beforeEach(function () {
      broker = new Broker();
      email = TestHelpers.createEmail();
      metrics = new Metrics();
      model = new Backbone.Model();
      notifier = new Notifier();
      onSubmitComplete = sinon.spy();
      relier = new Relier();
      windowMock = new WindowMock();

      relier.set({
        clientId: CLIENT_ID,
        permissions: PERMISSIONS,
        serviceName: SERVICE_NAME,
        serviceUri: SERVICE_URI
      });

      user = new User({});

      account = user.initAccount({
        email: email,
        sessionToken: 'fake session token',
        uid: 'uid'
      });

      sinon.stub(user, 'setAccount', function () {
        return p(account);
      });

      sinon.stub(account, 'fetchProfile', function () {
        return p();
      });

      model.set({
        account: account,
        onSubmitComplete: onSubmitComplete
      });
    });

    afterEach(function () {
      metrics.destroy();

      view.remove();
      view.destroy();

      view = metrics = null;
    });

    function initView (type) {
      view = new View({
        broker: broker,
        metrics: metrics,
        model: model,
        notifier: notifier,
        relier: relier,
        type: type,
        user: user,
        viewName: 'permissions',
        window: windowMock
      });

      sinon.spy(view, 'navigate');

      return view.render()
        .then(function () {
          $('#container').html(view.el);
        });
    }

    describe('renders', function () {
      describe('with a sessionToken', function () {
        beforeEach(function () {
          return initView('sign_up');
        });

        it('renders relier info', function () {
          assert.include(view.$('#permission-request').text(), SERVICE_NAME,
            'service name shows in paragraph');
        });

        it('renders some permissions', function () {
          assert.ok(view.$('.permission').length);
        });
      });

      describe('without a sessionToken', function () {
        beforeEach(function () {
          account.clear('sessionToken');
        });

        describe('coming from signin', function () {
          beforeEach(function () {
            return initView('sign_in');
          });

          it('redirects to /signin', function () {
            assert.isTrue(view.navigate.calledWith('/signin'));
          });
        });

        describe('coming from signup', function () {
          beforeEach(function () {
            return initView('sign_up');
          });

          it('redirects to /signup', function () {
            assert.isTrue(view.navigate.calledWith('/signup'));
          });
        });
      });
    });

    describe('submit', function () {
      beforeEach(function () {
        sinon.spy(account, 'setClientPermissions');

        return initView('sign_in')
          .then(function () {

            return view.submit();
          });
      });

      it('saves the granted permissions', function () {
        assert.isTrue(
          account.setClientPermissions.calledWith(CLIENT_ID, {
            'profile:email': true,
            'profile:uid': true
          }));
      });

      it('sets the account', function () {
        assert.isTrue(user.setAccount.calledWith(account));
      });

      it('calls onSubmitComplete', function () {
        assert.isTrue(onSubmitComplete.calledWith(account));
      });
    });

    describe('_getPermissionConfig', function () {
      var permission;

      describe('with a valid permission', function () {
        beforeEach(function () {
          return initView('sign_up')
            .then(function () {
              permission = view._getPermissionConfig('profile:email');
            });
        });

        it('returns the permission', function () {
          assert.equal(permission.name, 'profile:email');
        });
      });

      describe('with an invalid permission', function () {
        beforeEach(function () {
          return initView('sign_up')
            .then(function () {
              permission = view._getPermissionConfig('invalid');
            });
        });

        it('returns null', function () {
          assert.isNull(permission);
        });
      });
    });

    describe('_validatePermissions', function () {
      beforeEach(function () {
        return initView('sign_up')
          .then(function () {
            sinon.spy(view, 'logError');
            view._validatePermissions(['profile:invalid', 'profile:email']);
          });
      });

      it('logs an error for invalid permissions', function () {
        assert.isTrue(view.logError.calledOnce);

        var error = view.logError.args[0][0];

        assert.isTrue(OAuthErrors.is(error, 'INVALID_SCOPES'));
        assert.equal(error.context, 'profile:invalid');
      });
    });

    describe('_getApplicablePermissions', function () {
      var permissions;

      beforeEach(function () {
        account.clear();
        account.set({
          displayName: 'Test user',
          email: 'testuser@testuser.com',
          uid: 'users id'
        });

        return initView('sign_up')
          .then(function () {
            sinon.spy(view, 'logError');
          });
      });

      describe('with valid permissions', function () {
        beforeEach(function () {
          permissions = view._getApplicablePermissions(account, [
            'profile:email',
            'profile:display_name',
            'profile:avatar',
            'profile:uid'
          ]);
        });

        it('returns requested permissions if the account has a value', function () {
          assert.equal(permissions.length, 3);

          assert.equal(permissions[0], 'profile:email');
          assert.equal(permissions[1], 'profile:display_name');
          assert.equal(permissions[2], 'profile:uid');
        });
      });

      describe('with an invalid permission', function () {
        beforeEach(function () {
          permissions =
            view._getApplicablePermissions(account, [
              'profile:email',
              'profile:invalid'
            ]);
        });

        it('filters the invalid permission', function () {
          assert.lengthOf(permissions, 1);
          assert.equal(permissions[0], 'profile:email');
        });
      });
    });

    describe('_sortPermissions', function () {
      var sortedPermissions;
      beforeEach(function () {
        var requestedPermissions = ['profile:display_name', 'profile:email'];

        return initView('sign_up')
          .then(function () {
            sortedPermissions = view._sortPermissions(requestedPermissions);
          });
      });

      it('sorts the permissions', function () {
        var expectedSortedPermissions =
            ['profile:email', 'profile:display_name'];

        assert.deepEqual(sortedPermissions, expectedSortedPermissions);
      });
    });

    describe('_getPermissionsHTML', function () {
      beforeEach(function () {
        account.clear();
        account.set({
          displayName: 'Test user',
          email: 'testuser@testuser.com',
          uid: 'users id'
        });

        // permissions are passed in unsorted
        var permissionNames = ['profile:display_name', 'profile:email', 'profile:uid'];

        return initView('sign_up')
          .then(function () {
            var html = view._getPermissionsHTML(account, permissionNames);
            $('#container').html(html);
          });
      });

      it('correctly sorts and renders required permission', function () {
        var permissionContainer = $('#container fieldset:nth(0)');
        assert.equal(permissionContainer.attr('disabled'), 'disabled');
        assert.include(permissionContainer.find('.fxa-checkbox__label').text(), 'required');
        assert.equal(permissionContainer.find('input[type=checkbox]').attr('disabled'), 'disabled');

        var html = permissionContainer.html();
        assert.include(html, 'testuser@testuser.com');
        assert.include(html, 'value="profile:email"');
      });

      it('correctly renders non-required permission', function () {
        var permissionContainer = $('#container fieldset:nth(1)');
        assert.isUndefined(permissionContainer.attr('disabled'));
        assert.isUndefined(permissionContainer.find('input[type=checkbox]').attr('disabled'));

        var html = permissionContainer.html();
        assert.include(html, 'Test user');
        assert.include(html, 'value="profile:display_name"');
      });

      it('correctly renders hidden permission', function () {
        var permissionContainer = $('#container fieldset:nth(2)');

        assert.equal(permissionContainer.find('input[type=checkbox]').attr('disabled'), 'disabled');
        assert.isTrue(permissionContainer.hasClass('hidden'));

        var html = permissionContainer.html();
        assert.include(html, 'value="profile:uid"');
      });

      it('adds `required` text to `required` permissions', function () {
        var permissionContainer = $('#container fieldset:nth(0)');
        var html = permissionContainer.html();
        console.log('permissionLabel', html);
        assert.include(html, 'required');
      });
    });

    describe('_getFormPermissions', function () {
      var clientPermissions;

      beforeEach(function () {
        account.set({
          displayName: 'Test user',
          email: 'testuser@testuser.com',
          uid: 'user id'
        });

        // only profile:email and profile:display_name should be displayed
        // profile:avatar is not applicable since user does not yet have one
        relier.set('permissions',
          ['profile:email', 'profile:display_name', 'profile:avatar', 'profile:uid']);

        return initView('sign_up')
          .then(function () {
            // profile:email is the only visible item left after this.
            $('#container').find('.permission[name="profile:display_name"]')
              .removeAttr('checked');

            clientPermissions = view._getFormPermissions();
          });
      });

      it('returns permissions that are selected', function () {
        assert.lengthOf(Object.keys(clientPermissions), 3);
        assert.isFalse(clientPermissions['profile:display_name']);
        assert.isTrue(clientPermissions['profile:email']);
        assert.isTrue(clientPermissions['profile:uid']);
      });
    });
  });
});
