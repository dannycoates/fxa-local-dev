/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

define([
  'tests/lib/request',
  'intern/node_modules/dojo/Promise',
  'intern/dojo/node!../../server/lib/configuration'
], function (request, Deferred, config) {
  var API_KEY = config.get('basket.api_key');
  var API_URL = config.get('basket.api_url');

  var LOOKUP_URL = API_URL + '/lookup-user/?email=';

  function waitUntilUserIsRegistered(email) {
    console.log('Waiting for %s to register at: %s', email, API_URL);

    var url = LOOKUP_URL + encodeURIComponent(email);
    return request(url, 'GET', null, { 'X-API-Key': API_KEY })
      .then(function (result) {
        if (result.status === 'ok') {
          return result;
        } else {
          var dfd = new Promise.Deferred();
          setTimeout(function () {
            waitUntilUserIsRegistered(email)
              .then(dfd.resolve, dfd.reject);
          }, 1000);

          return dfd.promise;
        }
      });
  }

  return waitUntilUserIsRegistered;
});
