/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define([
  'tests/intern',
  'intern!tdd',
  'intern/chai!assert',
  'client/FxAccountClient',
  'intern/node_modules/dojo/has!host-node?intern/node_modules/dojo/node!xmlhttprequest',
  'tests/addons/sinonResponder',
  'tests/mocks/request',
  'tests/addons/restmail',
  'tests/addons/accountHelper'
], function (config, tdd, assert, FxAccountClient, XHR, SinonResponder, RequestMocks, Restmail, AccountHelper) {

  with (tdd) {
    suite('accountDestroy', function () {
      var authServerUrl = config.AUTH_SERVER_URL || 'http://127.0.0.1:9000/v1';
      var useRemoteServer = !!config.AUTH_SERVER_URL;
      var mailServerUrl = authServerUrl.match(/^http:\/\/127/) ?
        'http://127.0.0.1:9001' :
        'http://restmail.net';
      var client;
      var respond;
      var mail;
      var accountHelper;

      function noop(val) { return val; }

      if (!useRemoteServer) {
        console.log("Running with mocks..");
      } else {
        console.log("Running against " + authServerUrl);
      }

      beforeEach(function () {
        var xhr;

        if (useRemoteServer) {
          xhr = XHR.XMLHttpRequest;
          respond = noop;
        } else {
          var requests = [];
          xhr = SinonResponder.useFakeXMLHttpRequest();
          xhr.onCreate = function (xhr) {
            requests.push(xhr);
          };
          respond = SinonResponder.makeMockResponder(requests);
        }
        client = new FxAccountClient(authServerUrl, { xhr: xhr });
        mail = new Restmail(mailServerUrl, xhr);
        accountHelper = new AccountHelper(client, mail, respond);
      });

      /**
       * Destroy Account
       */
      test('#destroy', function () {
        var email;
        var password;

        return accountHelper.newVerifiedAccount()
          .then(function (account) {
            email = account.input.email;
            password = account.input.password;

            return respond(client.accountDestroy(email, password), RequestMocks.accountDestroy)
          })
          .then(
            function(res) {
              assert.ok(res, '== got response');

              return respond(client.signIn(email, password), RequestMocks.signIn)
            }
          ).then(
            function (res) {
            },
            function (error) {
              assert.ok(error, '== error should happen');
              assert.equal(error.message, 'Unknown account', '== Account is gone');
              assert.equal(error.code, 400, '== Correct status code');

              return error;
            }
        );
      });

    });
  }
});
