/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function (require, exports, module) {
  'use strict';

  var chai = require('chai');
  var Constants = require('lib/constants');
  var FxiOSV2AuthenticationBroker = require('models/auth_brokers/fx-ios-v2');
  var NullChannel = require('lib/channels/null');
  var Relier = require('models/reliers/relier');
  var sinon = require('sinon');
  var User = require('models/user');
  var WindowMock = require('../../../mocks/window');

  var assert = chai.assert;

  describe('models/auth_brokers/fx-ios-v2', function () {
    var account;
    var broker;
    var channel;
    var relier;
    var user;
    var windowMock;

    beforeEach(function () {
      channel = new NullChannel();
      relier = new Relier();
      windowMock = new WindowMock();

      user = new User();
      account = user.initAccount({
        email: 'testuser@testuser.com',
        keyFetchToken: 'key-fetch-token',
        unwrapBKey: 'unwrap-b-key'
      });

      broker = new FxiOSV2AuthenticationBroker({
        channel: channel,
        relier: relier,
        window: windowMock
      });

      sinon.spy(broker, 'send');
    });

    it('disables the `chooseWhatToSyncCheckbox` capability', function () {
      return broker.fetch()
        .then(function () {
          assert.isFalse(broker.hasCapability('chooseWhatToSyncCheckbox'));
        });
    });

    it('has all sync content types', function () {
      assert.equal(broker.defaultCapabilities.chooseWhatToSyncWebV1.engines, Constants.DEFAULT_DECLINED_ENGINES);
    });

    describe('afterSignUp', function () {
      it('has the `chooseWhatToSyncWebV1` capability by default', function () {
        return broker.afterSignUp(account)
          .then(function (behavior) {
            assert.equal(behavior.endpoint, 'choose_what_to_sync');
          });
      });

      it('causes a redirect to `/choose_what_to_sync` if `chooseWhatToSyncWebV1` capability is supported', function () {
        sinon.stub(broker, 'hasCapability', function (capabilityName) {
          return capabilityName === 'chooseWhatToSyncWebV1';
        });

        return broker.afterSignUp(account)
          .then(function (behavior) {
            assert.equal(behavior.endpoint, 'choose_what_to_sync');
          });
      });

      it('does nothing if `chooseWhatToSyncWebV1` capability is unsupported', function () {
        sinon.stub(broker, 'hasCapability', function (capabilityName) {
          return false;
        });

        return broker.afterSignUp(account)
          .then(function (behavior) {
            assert.isUndefined(behavior);
          });
      });
    });
  });
});
