/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var config = require('../configuration');
var publicUrl = config.get('public_url');
var authServerUrl = config.get('fxaccount_url');
var isAuthServerProxyEnabled = config.get('fxaccount_proxy.enabled');
var oauthServerUrl = config.get('oauth_url');
var isOauthServerProxyEnabled = config.get('oauth_proxy.enabled');

function isIE8(userAgent) {
  return /MSIE 8\.0/.test(userAgent);
}

function getAuthServerUrl(userAgent) {
  if (isAuthServerProxyEnabled && isIE8(userAgent)) {
    return publicUrl + '/auth';
  }

  return authServerUrl;
}

function getOAuthServerUrl(userAgent) {
  if (isOauthServerProxyEnabled && isIE8(userAgent)) {
    return publicUrl + '/oauth';
  }

  return oauthServerUrl;
}

module.exports = function(i18n) {
  var route = {};

  route.method = 'get';
  route.path = '/config';

  route.process = function(req, res) {
    // `language` and `cookiesEnabled` are dynamic so don't cache.
    res.header('Cache-Control', 'no-cache, max-age=0');

    // Let any intermediaries know that /config can vary based
    // on the accept-language. This will also be useful if client.json
    // gains long lived cache-control headers.
    res.set('Vary', 'accept-language');

    // charset must be set on json responses.
    res.charset = 'utf-8';

    var userAgent = req.get('user-agent');
    res.json({
      // The `__cookies_check` cookie is set in client code
      // to see if cookies are enabled. If cookies are disabled,
      // the `__cookie_check` cookie will not arrive.
      cookiesEnabled: !!req.cookies['__cookie_check'],
      fxaccountUrl: getAuthServerUrl(userAgent),
      oauthUrl: getOAuthServerUrl(userAgent),
      // req.lang is set by abide in a previous middleware.
      language: req.lang,
      metricsSampleRate: config.get('metrics.sample_rate')
    });
  };

  return route;
};

