/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * A broker that knows how to finish an OAuth flow. Should be subclassed
 * to override `sendOAuthResultToRelier`
 */

define([
  'underscore',
  'lib/constants',
  'lib/url',
  'lib/oauth-errors',
  'lib/auth-errors',
  'lib/promise',
  'lib/validate',
  'models/auth_brokers/base',
  'views/behaviors/halt',
  'views/behaviors/navigate'
],
function (_, Constants, Url, OAuthErrors, AuthErrors, p, Validate,
      BaseAuthenticationBroker, HaltBehavior, NavigateBehavior) {
  'use strict';

  /**
   * Formats the OAuth "result.redirect" url into a {code, state} object
   *
   * @param {Object} result
   * @returns {Object}
   */
  function _formatOAuthResult(result) {

    // get code and state from redirect params
    if (! result) {
      return p.reject(OAuthErrors.toError('INVALID_RESULT'));
    } else if (! result.redirect) {
      return p.reject(OAuthErrors.toError('INVALID_RESULT_REDIRECT'));
    }

    var redirectParams = result.redirect.split('?')[1];

    result.state = Url.searchParam('state', redirectParams);
    result.code = Url.searchParam('code', redirectParams);

    if (! Validate.isOAuthCodeValid(result.code)) {
      return p.reject(OAuthErrors.toError('INVALID_RESULT_CODE'));
    }

    return p(result);
  }

  var proto = BaseAuthenticationBroker.prototype;

  var OAuthAuthenticationBroker = BaseAuthenticationBroker.extend({
    type: 'oauth',

    defaultBehaviors: _.extend({}, proto.defaultBehaviors, {
      // the relier will take over after sign in, no need to transition.
      afterForceAuth: new HaltBehavior(),
      afterSignIn: new HaltBehavior()
    }),

    defaultCapabilities: _.extend({}, proto.defaultCapabilities, {
      // Disable signed-in notifications for OAuth due to the potential for
      // unintended consequences from redirecting to a relier URL more than
      // once.
      handleSignedInNotification: false
    }),

    initialize: function (options) {
      options = options || {};

      this.session = options.session;
      this._assertionLibrary = options.assertionLibrary;
      this._oAuthClient = options.oAuthClient;

      return BaseAuthenticationBroker.prototype.initialize.call(
                  this, options);
    },

    getOAuthResult: function (account) {
      var self = this;
      if (! account || ! account.get('sessionToken')) {
        return p.reject(AuthErrors.toError('INVALID_TOKEN'));
      }

      return self._assertionLibrary.generate(account.get('sessionToken'))
        .then(function (assertion) {
          var relier = self.relier;
          var oauthParams = {
            assertion: assertion,
            client_id: relier.get('clientId'), //eslint-disable-line camelcase
            scope: relier.get('scope'),
            state: relier.get('state')
          };
          if (relier.get('accessType') === Constants.ACCESS_TYPE_OFFLINE) {
            oauthParams.access_type = Constants.ACCESS_TYPE_OFFLINE; //eslint-disable-line camelcase
          }
          return self._oAuthClient.getCode(oauthParams);
        })
        .then(_formatOAuthResult);
    },

    /**
     * Overridden by subclasses to provide a strategy to finish the OAuth flow.
     *
     * @param {string} result.state - state sent by OAuth RP
     * @param {string} result.code - OAuth code generated by the OAuth server
     * @param {string} result.redirect - URL that can be used to redirect to
     * the RP.
     */
    sendOAuthResultToRelier: function (/*result*/) {
      return p.reject(new Error('subclasses must override sendOAuthResultToRelier'));
    },

    finishOAuthSignInFlow: function (account, additionalResultData) {
      additionalResultData = additionalResultData || {};
      additionalResultData.action = Constants.OAUTH_ACTION_SIGNIN;
      return this.finishOAuthFlow(account, additionalResultData);
    },

    finishOAuthSignUpFlow: function (account, additionalResultData) {
      additionalResultData = additionalResultData || {};
      additionalResultData.action = Constants.OAUTH_ACTION_SIGNUP;
      return this.finishOAuthFlow(account, additionalResultData);
    },

    finishOAuthFlow: function (account, additionalResultData) {
      var self = this;
      self.session.clear('oauth');
      return self.getOAuthResult(account)
        .then(function (result) {
          if (additionalResultData) {
            result = _.extend(result, additionalResultData);
          }
          return self.sendOAuthResultToRelier(result);
        });
    },

    persistVerificationData: function (account) {
      var self = this;
      return p().then(function () {
        var relier = self.relier;
        self.session.set('oauth', {
          access_type: relier.get('access_type'), //eslint-disable-line camelcase
          action: relier.get('action'),
          client_id: relier.get('clientId'), //eslint-disable-line camelcase
          keys: relier.get('keys'),
          scope: relier.get('scope'),
          state: relier.get('state'),
          webChannelId: self.get('webChannelId')
        });

        return proto.persistVerificationData.call(self, account);
      });
    },

    afterForceAuth: function (account, additionalResultData) {
      var self = this;
      return self.finishOAuthSignInFlow(account, additionalResultData)
        .then(function () {
          return proto.afterForceAuth.call(self, account);
        });
    },

    afterSignIn: function (account, additionalResultData) {
      var self = this;
      return self.finishOAuthSignInFlow(account, additionalResultData)
        .then(function () {
          return proto.afterSignIn.call(self, account);
        });
    },

    afterSignUp: function (account) {
      var relier = this.relier;
      return p().then(function () {
        if (relier.accountNeedsPermissions(account)) {
          return new NavigateBehavior('signup_permissions', {
            data: {
              account: account
            }
          });
        }
      });
    },

    afterSignUpConfirmationPoll: function (account) {
      // The original tab always finishes the OAuth flow if it is still open.
      return this.finishOAuthSignUpFlow(account);
    },

    afterResetPasswordConfirmationPoll: function (account) {
      return this.finishOAuthSignInFlow(account);
    },

    transformLink: function (link) {
      return '/oauth' + link;
    }
  });

  return OAuthAuthenticationBroker;
});
